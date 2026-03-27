import React, { useEffect, useState } from 'react'
import { Table, Card, Empty, Typography, Tag, message, Input, Button, Space, Spin } from 'antd'
import { ClockCircleOutlined, UserOutlined, MessageOutlined } from '@ant-design/icons'
import { useSvnStore } from '../stores/svn-store'

const { Text, Paragraph } = Typography

interface LogEntry {
  revision: number
  author: string
  date: string
  message: string
  paths: Array<{
    action: string
    path: string
  }>
}

const HistoryPanel: React.FC = () => {
  const { selectedNode } = useSvnStore()
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<LogEntry[]>([])
  const [searchPath, setSearchPath] = useState('')

  useEffect(() => {
    if (selectedNode) {
      loadHistory(selectedNode)
    }
  }, [selectedNode])

  const loadHistory = async (path: string) => {
    setLoading(true)
    try {
      const logs = await window.api.svn.log(path, 100)
      setHistory(logs)
    } catch (error) {
      message.error('加载历史记录失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (searchPath.trim()) {
      loadHistory(searchPath)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'A': return 'green'
      case 'M': return 'blue'
      case 'D': return 'red'
      case 'R': return 'orange'
      default: return 'default'
    }
  }

  const columns = [
    {
      title: '版本',
      dataIndex: 'revision',
      key: 'revision',
      width: 100,
      render: (revision: number) => <Tag color="purple">r{revision}</Tag>
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 120,
      render: (author: string) => (
        <Space>
          <UserOutlined />
          <Text>{author}</Text>
        </Space>
      )
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 180,
      render: (date: string) => (
        <Space>
          <ClockCircleOutlined />
          <Text type="secondary">{formatDate(date)}</Text>
        </Space>
      )
    },
    {
      title: '描述',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message: string) => (
        <Paragraph
          ellipsis={{ rows: 2, expandable: true }}
          style={{ marginBottom: 0 }}
        >
          {message || '(无描述)'}
        </Paragraph>
      )
    },
    {
      title: '变更文件',
      dataIndex: 'paths',
      key: 'paths',
      width: 150,
      render: (paths: LogEntry['paths']) => (
        <Text type="secondary">{paths.length} 个文件</Text>
      )
    }
  ]

  const expandedRowRender = (record: LogEntry) => (
    <div style={{ padding: '8px 16px' }}>
      <Text strong>变更详情：</Text>
      <div style={{ marginTop: 8 }}>
        {record.paths.map((p, index) => (
          <div key={index} style={{ marginBottom: 4 }}>
            <Tag color={getActionColor(p.action)}>{p.action}</Tag>
            <Text code>{p.path}</Text>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <Card
      title="版本历史"
      extra={
        <Space>
          <Input
            placeholder="输入路径查看历史"
            value={searchPath}
            onChange={(e) => setSearchPath(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
          />
          <Button type="primary" onClick={handleSearch}>
            查询
          </Button>
        </Space>
      }
    >
      {loading ? (
        <div style={styles.loading}>
          <Spin />
        </div>
      ) : history.length === 0 ? (
        <Empty description="选择文件或目录查看历史记录" />
      ) : (
        <Table
          columns={columns}
          dataSource={history}
          rowKey="revision"
          pagination={{
            pageSize: 20,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          expandable={{
            expandedRowRender,
            rowExpandable: (record) => record.paths.length > 0
          }}
          size="small"
        />
      )}
    </Card>
  )
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 200
  }
}

export default HistoryPanel