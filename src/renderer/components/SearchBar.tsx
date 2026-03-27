import React, { useState, useEffect } from 'react'
import { Input, Button, Space, Radio, message, Progress, Tag } from 'antd'
import { SearchOutlined, ClearOutlined, SyncOutlined, DatabaseOutlined } from '@ant-design/icons'
import { useSearchStore } from '../stores/search-store'

const { Search } = Input

interface IndexStatus {
  isIndexing: boolean
  hasIndex: boolean
  entryCount: number
  lastUpdated: string | null
}

const SearchBar: React.FC = () => {
  const { searchType, setSearchType, query, setQuery, setResults, setLoading, clearResults } = useSearchStore()
  const [indexStatus, setIndexStatus] = useState<IndexStatus | null>(null)
  const [indexingProgress, setIndexingProgress] = useState<number>(0)
  const [isIndexing, setIsIndexing] = useState(false)

  // 获取索引状态
  const loadIndexStatus = async () => {
    try {
      const status = await window.api.index.getStatus()
      setIndexStatus(status)
    } catch (error) {
      console.error('获取索引状态失败:', error)
    }
  }

  useEffect(() => {
    loadIndexStatus()

    // 监听索引进度
    const unsubscribe = window.api.index.onProgress((current) => {
      setIndexingProgress(current)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  // 开始索引
  const handleStartIndex = async () => {
    setIsIndexing(true)
    setIndexingProgress(0)
    message.loading({ content: '正在拉取仓库目录...', key: 'indexing' })

    try {
      const result = await window.api.index.start()
      if (result.success) {
        message.success({ content: `索引完成，共 ${result.count} 个条目`, key: 'indexing' })
        // 索引完成后立即刷新状态
        await loadIndexStatus()
      } else {
        message.error({ content: result.error || '索引失败', key: 'indexing' })
      }
    } catch (error) {
      message.error({ content: '索引失败: ' + (error as Error).message, key: 'indexing' })
    } finally {
      setIsIndexing(false)
      loadIndexStatus()
    }
  }

  // 清除索引
  const handleClearIndex = async () => {
    await window.api.index.clear()
    loadIndexStatus()
    message.success('索引已清除')
  }

  // 搜索
  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      message.warning('请输入搜索内容')
      return
    }

    if (!indexStatus?.hasIndex) {
      message.warning('请先拉取仓库目录')
      return
    }

    setLoading(true)
    try {
      if (searchType === 'filename') {
        const results = await window.api.search.filename(value)
        setResults(results)
        message.success(`找到 ${results.length} 个结果`)
      } else {
        const results = await window.api.search.content(value)
        setResults(results)
        message.success(`找到 ${results.length} 个结果`)
      }
    } catch (error) {
      message.error('搜索失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    clearResults()
    setQuery('')
  }

  const formatLastUpdated = (dateStr: string | null) => {
    if (!dateStr) return '未索引'
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN')
  }

  return (
    <div style={styles.container}>
      <Space size="middle" wrap style={{ marginBottom: 12 }}>
        <Radio.Group value={searchType} onChange={(e) => setSearchType(e.target.value)}>
          <Radio.Button value="filename">文件名搜索</Radio.Button>
          <Radio.Button value="content">内容搜索</Radio.Button>
        </Radio.Group>

        <Search
          placeholder={searchType === 'filename' ? '输入文件名关键词...' : '输入搜索内容...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={handleSearch}
          enterButton={<SearchOutlined />}
          allowClear
          style={{ width: 400 }}
        />

        <Button icon={<ClearOutlined />} onClick={handleClear}>
          清空
        </Button>
      </Space>

      <div style={styles.indexBar}>
        <Space>
          <DatabaseOutlined />
          <span>索引状态：</span>
          {indexStatus?.isIndexing ? (
            <Tag color="processing">正在索引...</Tag>
          ) : indexStatus?.hasIndex ? (
            <Tag color="success">{indexStatus.entryCount.toLocaleString()} 个条目</Tag>
          ) : (
            <Tag color="default">未索引</Tag>
          )}

          {indexStatus?.lastUpdated && (
            <span style={{ color: '#999', fontSize: 12 }}>
              最后更新: {formatLastUpdated(indexStatus.lastUpdated)}
            </span>
          )}

          <Button
            type="primary"
            icon={<SyncOutlined spin={isIndexing} />}
            onClick={handleStartIndex}
            disabled={isIndexing}
            size="small"
          >
            {isIndexing ? '索引中...' : '拉取仓库目录'}
          </Button>

          {indexStatus?.hasIndex && !isIndexing && (
            <Button size="small" danger onClick={handleClearIndex}>
              清除索引
            </Button>
          )}
        </Space>

        {isIndexing && (
          <Progress
            percent={100}
            status="active"
            showInfo={false}
            style={{ marginTop: 8, width: 300 }}
          />
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 16,
    background: '#fff',
    borderRadius: 8
  },
  indexBar: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #f0f0f0'
  }
}

export default SearchBar