# FoodReel（HUHU FOOD）

FoodReel 是一个帮助决定“今天吃什么”的前端应用。用户可以维护个人食物库，通过胶片转动随机选餐，确认后保存饮食记录，也可以使用高德地图查找附近餐饮。

项目使用 React 19、TypeScript 和 Vite。样式使用 Tailwind CSS 与独立 CSS 文件，动画和图标分别使用 Framer Motion 与 Lucide React。

## 已实现功能

- **本地账号**：支持注册、登录和退出；食物库与饮食记录按用户隔离。首次注册会迁移旧版未分账号的数据。
- **随机选餐**：胶片随机转动并停在抽中的食物上；可拖动胶片或使用左右方向键手动切换，确认后保存记录。
- **食物库管理**：添加、删除食物，区分默认与自定义项目；支持刷新默认食物并保留个人偏好，或恢复默认食物。
- **饮食日历**：切换月份、返回今天、查看和删除记录，也可以为所选日期手动补录。
- **数据备份**：导出或导入本机所有账号、食物和记录。导入前校验数据，冲突时取消，写入失败时尝试回滚；文件上限为 10 MB。
- **附近美食**：显示地图缩略图，进入详情后可定位、缩放、拖动地图、搜索区域和按关键词筛选餐饮。

## 本地运行

```bash
npm install
npm run dev
```

| 命令 | 功能 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | TypeScript 检查并构建生产版本到 `dist/` |
| `npm run preview` | 本地预览生产构建 |
| `npm run lint` | 使用 ESLint 检查项目代码 |

## 高德地图配置

在高德开放平台申请 Web 端 JS API Key，并在项目根目录的 `.env.local` 中配置：

```dotenv
VITE_AMAP_KEY=你的高德地图Key
VITE_AMAP_SECURITY_CODE=你的安全密钥
```

生产环境可以使用服务端代理，将配置改为：

```dotenv
VITE_AMAP_KEY=你的高德地图Key
VITE_AMAP_SERVICE_HOST=https://你的代理域名/_AMapService
```

`VITE_AMAP_SERVICE_HOST` 优先于 `VITE_AMAP_SECURITY_CODE`。所有 `VITE_*` 变量都会进入浏览器端代码；代理方案应将安全密钥配置在服务器。当前仓库没有实现代理服务。

未配置地图服务时，界面会提示地图暂未配置。地图加载失败时可以重试；定位失败后仍可拖动地图并搜索当前区域。搜索结果中的店铺名称可以先编辑，再通过食物名称校验后添加；坐标不会写入本地食物数据。

## 核心文件结构

```text
src/
├── App.tsx                         # 登录、选餐与抽屉页面
├── main.tsx                        # React 浏览器入口
├── components/                     # 页面业务组件
├── hooks/                          # 食物库、饮食记录与提示状态
├── data/defaultFoods.ts            # 默认食物列表
├── types/                          # 业务类型
└── utils/                           # 认证、浏览器存储、地图、备份与日期工具
```

## 数据保存

账号、食物与记录通过浏览器 `localStorage` 保存，没有服务端账号或云同步接口。数据不会在不同浏览器或设备间自动共享，可使用备份导出和导入。

| 存储键 | 内容 |
| --- | --- |
| `food-decider:accounts` | 本机账号标识、用户名、随机盐和密码摘要 |
| `food-decider:remembered-login` | 自动填充的用户名和明文密码，备份不包含此项 |
| `food-decider:user:<用户标识>:foods` | 当前用户的食物列表 |
| `food-decider:user:<用户标识>:records` | 当前用户按日期分组的饮食记录 |
| `food-decider:user:<用户标识>:deletedDefaults` | 当前用户删除过的默认食物名称 |
| `food-decider:foods`、`food-decider:records` | 旧版未按账号隔离的数据，首个账号注册时复制到该账号下 |

密码摘要使用随机盐和 PBKDF2 算法生成。登录页将用户名转换为大写，并限制为 1–7 个英文字母；注册密码至少 6 个字符，登录或注册密码最多 12 个字符。
