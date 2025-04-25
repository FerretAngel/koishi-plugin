# 基于koishi的插件目录

本插件是完美兼容云崽的喵喵插件的表情管理。
如果你使用过云崽的喵喵插件的添加/删除功能，那你会更容易上手本插件的！

## 数据迁移

本插件支持从云崽的喵喵插件迁移数据。

迁移方法：

1. 将喵喵云仔机器人的/Miao-Yunzai/data/目录下的**face**和**textJson**文件夹复制到koishi根目录**data/group-expression/**目录下
2. 重启本插件

### 目录示例
data/group-expression/face/[群号]/xxx.png
data/group-expression/textJson/[群号].json

### JSON示例
```json
{
  "雪貂": [
		[
			{
				"type": "image",
				"file": "xxx-946-540.jpg",
				"url": "xxxx",
				"asface": true,
				"from_user": {
					"card": "xxx",
					"nickname": "xxx",
					"user_id": xxx
				},
				"local": "./data/face/[群号]/雪貂.jpg"
			}
		],
		[
			{
				"type": "image",
				"file": "xxx-300-210.jpg",
				"url": "xxxx",
				"asface": true,
				"from_user": {
					"card": "雪小貂",
					"nickname": "雪貂•安吉欧",
					"user_id": xxx
				},
				"local": "./data/face/[群号]/xxx.jpg"
			}
		]
  ],
  "干嘛？": [
		[
			{
				"type": "image",
				"file": "xxx.jpg",
				"url": "xxx",
				"asface": true,
				"from_user": {
					"card": "雪貂•安吉欧",
					"nickname": "雪貂•安吉欧",
					"user_id": 1219460281
				},
				"local": "./data/face/[群号]/干嘛？.jpg"
			}
		]
	],
}
```
## 使用示例

### 添加表情
`#添加表情 [字符串]`

### 删除表情
`#删除表情 [字符串] [序号]`

### 搜索表情
`#搜索表情 [字符串] [页码]`

### 查看表情
`#查看表情 [字符串] [序号]`

