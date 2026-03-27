import React, { useState } from 'react'
import { Table, Tag, Empty, Typography, Tooltip, Button, Space, message, Popconfirm } from 'antd'
import { FileOutlined, FolderOutlined, DownloadOutlined } from '@ant-design/icons'
import { useSearchStore } from '../stores/search-store'

const { Text } = Typography

interface SearchResult {
  path: string
  name: string
  kind: 'file' | 'dir'
  score: number
}

interface ContentSearchResult {
  path: string
  line: number
  content: string
  matchStart: number
  matchEnd: number
}

interface ResultListProps {
  fullPage?: boolean
}

const ResultList: React.FC<ResultListProps> = ({ fullPage = false }) => {
  const { searchType, results, loading } = useSearchStore()
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (record: SearchResult) => {
    if (record.kind === 'dir') {
      message.warning('暂不支持下载目录')
      return
    }

    setDownloading(record.path)
    try {
      // 获取下载路径设置
      const settingsStr = localStorage.getItem('svn-searcher-settings')
      const settings = settingsStr ? JSON.parse(settingsStr) : {}
      const downloadPath = settings.downloadPath || undefined

      const result = await window.api.file.download(record.path, downloadPath)
      if (result.success) {
        message.success(`已下载到: ${result.path}`)
      } else {
        message.error(result.error || '下载失败')
      }
    } catch (error) {
      message.error('下载失败: ' + (error as Error).message)
    } finally {
      setDownloading(null)
    }
  }

  const renderFilenameColumns = () => [
    {
      title: '类型',
      dataIndex: 'kind',
      key: 'kind',
      width: 60,
      render: (kind: string) => (
        kind === 'dir' ? <FolderOutlined style={{ color: '#faad14' }} /> : <FileOutlined style={{ color: '#1890ff' }} />
      )
    },
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Text code>{name}</Text>
      )
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
      render: (path: string) => (
        <Tooltip title={path}>
          <Text type="secondary" style={{ fontSize: 12 }}>{path}</Text>
        </Tooltip>
      )
    },
    {
      title: '匹配度',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number) => (
        <Tag color={score < 0.2 ? 'green' : score < 0.5 ? 'orange' : 'red'}>
          {(1 - score).toFixed(2)}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: SearchResult) => (
        record.kind === 'file' ? (
          <Tooltip title="下载文件">
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              loading={downloading === record.path}
              onClick={() => handleDownload(record)}
            >
              下载
            </Button>
          </Tooltip>
        ) : null
      )
    }
  ]

  const renderContentColumns = () => [
    {
      title: '文件',
      dataIndex: 'path',
      key: 'path',
      width: 280,
      ellipsis: true,
      render: (path: string) => (
        <Tooltip title={path}>
          <Text code ellipsis style={{ maxWidth: 260 }}>{path}</Text>
        </Tooltip>
      )
    },
    {
      title: '行号',
      dataIndex: 'line',
      key: 'line',
      width: 70,
      render: (line: number) => <Tag color="blue">{line}</Tag>
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string, record: ContentSearchResult) => {
        const { matchStart, matchEnd } = record
        const before = content.substring(0, matchStart)
        const match = content.substring(matchStart, matchEnd)
        const after = content.substring(matchEnd)

        return (
          <Text code style={{ fontSize: 12 }}>
            {before}
            <span style={{ background: '#ffe58f', padding: '0 2px' }}>{match}</span>
            {after}
          </Text>
        )
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: ContentSearchResult) => (
        <Tooltip title="下载文件">
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            loading={downloading === record.path}
            onClick={async () => {
              setDownloading(record.path)
              try {
                const settingsStr = localStorage.getItem('svn-searcher-settings')
                const settings = settingsStr ? JSON.parse(settingsStr) : {}
                const downloadPath = settings.downloadPath || undefined

                const result = await window.api.file.download(record.path, downloadPath)
                if (result.success) {
                  message.success(`已下载到: ${result.path}`)
                } else {
                  message.error(result.error || '下载失败')
                }
              } catch (error) {
                message.error('下载失败')
              } finally {
                setDownloading(null)
              }
            }}
          >
            下载
          </Button>
        </Tooltip>
      )
    }
  ]

  if (results.length === 0 && !loading) {
    return (
      <div style={{ ...styles.container, height: fullPage ? 'calc(100vh - 200px)' : '100%' }}>
        <Empty
          description="输入关键词开始搜索"
          style={{ marginTop: fullPage ? 100 : 40 }}
        />
      </div>
    )
  }

  return (
    <div style={{ ...styles.container, height: fullPage ? 'calc(100vh - 200px)' : '100%' }}>
      <Table
        columns={searchType === 'filename' ? renderFilenameColumns() : renderContentColumns()}
        dataSource={results as any[]}
        rowKey={(record) =>
          searchType === 'filename'
            ? (record as SearchResult).path
            : `${(record as ContentSearchResult).path}-${(record as ContentSearchResult).line}`
        }
        loading={loading}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条结果`
        }}
        size="small"
        scroll={{ y: fullPage ? 'calc(100vh - 280px)' : 'calc(100% - 56px)' }}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#fff',
    borderRadius: 8,
    padding: 16,
    overflow: 'auto'
  }
}

export default ResultList