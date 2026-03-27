import React, { useState } from 'react'
import { Input, Select, Button, Space, Radio, message } from 'antd'
import { SearchOutlined, ClearOutlined } from '@ant-design/icons'
import { useSearchStore } from '../stores/search-store'
import { useSvnStore } from '../stores/svn-store'

const { Search } = Input

const SearchBar: React.FC = () => {
  const { searchType, setSearchType, query, setQuery, setResults, setLoading, clearResults } = useSearchStore()
  const { selectedNode } = useSvnStore()
  const [searchPath, setSearchPath] = useState<string>('')

  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      message.warning('请输入搜索内容')
      return
    }

    setLoading(true)
    try {
      const basePath = searchPath || selectedNode || undefined

      if (searchType === 'filename') {
        const results = await window.api.search.filename(value, basePath)
        setResults(results)
      } else {
        const results = await window.api.search.content(value, basePath)
        setResults(results)
      }

      message.success('搜索完成')
    } catch (error) {
      message.error('搜索失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    clearResults()
    setQuery('')
    setSearchPath('')
  }

  return (
    <div style={styles.container}>
      <Space size="middle" wrap>
        <Radio.Group value={searchType} onChange={(e) => setSearchType(e.target.value)}>
          <Radio.Button value="filename">文件名搜索</Radio.Button>
          <Radio.Button value="content">内容搜索</Radio.Button>
        </Radio.Group>

        <Input
          placeholder="搜索路径（可选）"
          value={searchPath}
          onChange={(e) => setSearchPath(e.target.value)}
          style={{ width: 250 }}
        />

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
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 16,
    background: '#fff',
    borderRadius: 8
  }
}

export default SearchBar