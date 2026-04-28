# cgnsMeshCutter 阶段二：适配设计文档

## 1. 接口分析

### 1.1 mpiAdapter 接口（需要保持）

**核心静态方法：**
- `Initialize(argc, argv)` / `Finalize()` - MPI 生命周期
- `size()` / `rank()` / `isMaster()` / `isLast()` / `isParallel()` - 进程信息
- `Barrier()` - 屏障同步
- `Bcast<T>(buf, count, root)` - 广播
- `Send<T>(data, count, dest, tag)` / `Recv<T>(data, count, src, tag, status)` - 点对点
- `ISend<T>/IRecv<T>(buf, count, dest/src, tag, request)` - 非阻塞通信
- `AllReduce<T>(src, dst, count, op)` - 全局归约
- `WaitAll(count, requests, status)` / `RequestFree(request)` - 请求管理
- `AllGatherV<T>(sendBuf, count, recvBuf, disp)` - 可变长收集
- `TypeContiguous/TypeStruct/TypeCommit/TypeFree` - MPI 数据类型构建

### 1.2 cgFile 接口（需要保持）

**CGFile 类核心方法：**
- 构造：`CGFile(filename, mode)` - 打开 CGNS 文件
- `close()` - 关闭文件
- `nCell()`/`nNode()` - 网格数量
- `loadCoordinate(rangeMin, rangeMax)` - 加载坐标
- `loadSection(id/start/end)` - 加载 Section 数据
- `section(id)`/`addSection()` - Section 访问
- `bodySectionIdList()`/`bdySectionIdList()` - Section 分类
- `writeCoordinate(data)`/`writeSection(section, nodeIdMap)` - 写入数据

## 2. 适配方案

### 2.1 compi 适配 (mpiAdapter.h/cpp)

**设计策略：** 保持 MPIAdapter 静态类接口，内部使用 compi::Environment 和 compi::Context

```cpp
// mpiAdapter.h - 新实现
#pragma once

#include <compi/context.h>
#include <compi/collectives.h>
#include <compi/p2p.h>

#include <mpi.h>
#include <vector>
#include <type_traits>

class MPIAdapter
{
private:
    static std::unique_ptr<compi::Environment> _env;
    static compi::Context* _ctx;
    
    // 辅助函数：获取 MPI_Datatype
    template <typename T>
    static MPI_Datatype getMpiType();

public:
    static void Initialize(int *argc, char ***argv);
    static void Finalize();
    
    static int size();
    static int rank();
    static bool isMaster();
    static bool isLast();
    static bool isParallel();
    
    static void Barrier();
    
    template <typename T>
    static void Bcast(T* buf, int count, int root);
    
    template <typename T>
    static void Send(const T* data, int count, int dest, int tag);
    
    template <typename T>
    static void Recv(T* data, int count, int src, int tag, MPI_Status* status);
    
    template <typename T>
    static void ISend(const T* buf, int count, int dest, int tag, MPI_Request* request);
    
    template <typename T>
    static void IRecv(T* buf, int count, int src, int tag, MPI_Request* request);
    
    template <typename T>
    static void AllReduce(T& src, T& dst, int count, MPI_Op op);
    
    static void WaitAll(int count, MPI_Request* requests, MPI_Status* statuses);
    static void RequestFree(MPI_Request* request);
    
    template <typename T>
    static void AllGatherV(T* sendBuf, int count, std::vector<T>& recvBuf, std::vector<int>& disp);
    
    // MPI 数据类型构建（直接转发到 MPI）
    static void TypeContiguous(int count, MPI_Datatype oldtype, MPI_Datatype* newtype);
    static void TypeStruct(int count, int* blk_len, MPI_Aint* disp, MPI_Datatype* types, MPI_Datatype* newtype);
    static void TypeCommit(MPI_Datatype* newtype);
    static void TypeFree(MPI_Datatype* newtype);
};
```

**关键实现点：**
1. 使用 `compi::Environment` 管理 MPI_Init/Finalize
2. 使用 `compi::Context::for_comm(MPI_COMM_WORLD)` 获取上下文
3. 集体通信使用 `compi::collectives::*` 函数
4. 点对点通信直接使用 MPI（compi 的 p2p.h 提供可选封装）
5. 保持模板接口不变，内部调用 compi 或原生 MPI

### 2.2 cgio 适配 (cgFile.h/cpp)

**设计策略：** 保持 CGFile 类接口，内部使用 CGIO::File/Zone/Section

```cpp
// cgFile.h - 新实现（简化版）
#pragma once

#include <cgio/file.h>
#include <cgio/zone.h>
#include <cgio/section.h>
#include <cgio/coordinate_view.h>

#include <cgnslib.h>
#include <vector>
#include <string>
#include <map>

namespace MeshCut
{
class CGFile
{
private:
    std::unique_ptr<CGIO::File> _file;
    CGIO::Zone* _zone;
    std::map<int, CGIO::Section*> _sections;
    
    // 缓存元数据
    cgsize_t _nNode, _nCell;
    std::vector<int> _bodySectionIds, _bdySectionIds;
    
public:
    CGFile(std::string filename, int mode = CG_MODE_READ);
    ~CGFile();
    
    void close();
    
    cgsize_t nCell() const;
    void nCell(cgsize_t ncell);
    cgsize_t nNode() const;
    void nNode(cgsize_t nnode);
    
    std::vector<std::vector<double>> loadCoordinate(cgsize_t rangeMin, cgsize_t rangeMax);
    
    // Section 加载
    Section& loadSection(int id);
    Section& loadSection(int id, cgsize_t start, cgsize_t end);
    Section loadSection(const std::vector<int>& idList);
    
    Section& section(int id);
    Section& addSection();
    Section bodySection();
    
    const std::vector<int>& bodySectionIdList() const;
    const std::vector<int>& bdySectionIdList() const;
    
    // 写入
    void writeCoordinate(const std::vector<std::vector<double>>& data);
    void writeSection(Section& curS, const std::map<cgsize_t, cgsize_t>& nodeIdG2L);
    void writeGlobalInfo(const Section& curS, cgsize_t n, cgsize_t start, cgsize_t end);
    
    // 静态工具
    static std::vector<std::vector<cgsize_t>> allFaceInCell(
        const std::vector<cgsize_t>& idList, ElementType_t type);
    static ElementType_t CellType(int nodeCnt, int dim);
    static ElementType_t CellType(int CGNSCellTypeFlag);
};
}
```

**关键实现点：**
1. 使用 `CGIO::File` 管理文件句柄
2. 通过 `File::get_database(1).get_zone(1)` 访问 Zone
3. Section 数据通过 `Zone::get_section(i)` 访问
4. 坐标通过 `Zone::coordinate_view()` 读取
5. 保持 Section 内部结构（data/offset/typeFlag）以兼容上层代码

## 3. CMakeLists.txt 更新

```cmake
# 添加 compi 依赖
add_subdirectory(/home/one/projects/compi compi)
target_link_libraries(${TgtLib} PUBLIC compi::compi)

# 添加 cgio 依赖
add_subdirectory(/home/one/projects/cgio cgio)
target_link_libraries(${TgtLib} PUBLIC cgio::cgio)

# 升级 C++ 标准到 C++17
set(CMAKE_CXX_STANDARD 17)

# 移除旧的 mpiAdapter.cpp 和 cgFile.cpp 从 target_sources
# 添加新的实现文件
```

## 4. 文件变更清单

### 修改：
- `CMakeLists.txt` - 添加 compi/cgio 依赖，升级 C++ 标准
- `src/CMakeLists.txt` - 更新源文件列表

### 重写：
- `src/mpiAdapter.h` - 使用 compi API 重写
- `src/mpiAdapter.cpp` - 使用 compi API 重写
- `src/cgFile.h` - 使用 cgio API 重写
- `src/cgFile.cpp` - 使用 cgio API 重写

### 删除：
- 无（覆盖原文件）

### 保持不变：
- `src/cartesianCutter.h/cpp` - 接口兼容
- `src/metisCutter.h/cpp` - 接口兼容
- 其他工具文件

## 5. 风险与注意事项

1. **C++ 标准升级**：compi 和 cgio 都需要 C++17，项目需从 C++11 升级
2. **Section 数据格式**：cgio 的 Section 接口可能不同，需要适配数据加载逻辑
3. **MPI 数据类型**：compi 的模板函数可能需要特殊处理 MPI_Datatype
4. **错误处理**：compi 使用 Result<T> 模式，需要转换为异常或检查
5. **坐标读取**：cgio 的 CoordinateView 是只读视图，需要复制到 vector<vector<double>>

## 6. 验收步骤

1. 更新 CMakeLists.txt
2. 重写 mpiAdapter.h/cpp
3. 重写 cgFile.h/cpp
4. 编译验证：`cd build && cmake .. && make -j`
5. 运行测试：`./cutter.exe -m pipe.cgns -np 2`
6. CFD 验证：`mpirun -n 2 /home/one/app/act/incomACT.exe -c pipe.yaml`
