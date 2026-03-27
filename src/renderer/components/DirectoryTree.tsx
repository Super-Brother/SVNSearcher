import React, { useEffect, useState } from 'react'
import { Tree, Spin, message, Empty, Input, Dropdown } from 'antd'
import { FolderOutlined, FileOutlined, MoreOutlined } from '@ant-design/icons'
import type { TreeDataNode, TreeProps } from 'antd'
import { useSvnStore } from '../stores/svn-store'

interface SVNEntry {
  name: string
  kind: 'file' | 'dir'
  path: string
}

const DirectoryTree: React.FC = () => {
  const { treeData, setTreeData, addChildren, expandedKeys, setExpandedKeys, selectedNode, setSelectedNode, loading, setLoading } = useSvnStore()
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    loadRootDirectory()
  }, [])

  const loadRootDirectory = async () => {
    setLoading(true)
    try {
      const credentials = await window.api.auth.getStoredCredentials()
      if (credentials) {
        const entries = await window.api.svn.list(credentials.url)
        const nodes = convertToTreeNodes(entries, credentials.url)
        setTreeData(nodes)
      }
    } catch (error) {
      message.error('加载目录失败: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const convertToTreeNodes = (entries: SVNEntry[], basePath: string): TreeDataNode[] => {
    return entries.map((entry) => ({
      key: entry.path,
      title: entry.name,
      icon: entry.kind === 'dir' ? <FolderOutlined /> : <FileOutlined />,
      isLeaf: entry.kind === 'file',
      children: entry.kind === 'dir' ? [] : undefined
    }))
  }

  const onLoadData: TreeProps['loadData'] = async (treeNode) => {
    if (treeNode.children && treeNode.children.length > 0) {
      return
    }

    try {
      const entries = await window.api.svn.list(treeNode.key as string)
      const nodes = convertToTreeNodes(entries, treeNode.key as string)
      addChildren(treeNode.key as string, nodes)
    } catch (error) {
      message.error('加载子目录失败')
    }
  }

  const handleSelect: TreeProps['onSelect'] = (selectedKeys) => {
    if (selectedKeys.length > 0) {
      setSelectedNode(selectedKeys[0] as string)
    }
  }

  const handleExpand: TreeProps['onExpand'] = (expandedKeys) => {
    setExpandedKeys(expandedKeys as string[])
  }

  const filterTree = (nodes: TreeDataNode[], text: string): TreeDataNode[] => {
    if (!text) return nodes

    return nodes
      .map((node) => {
        const title = node.title as string
        const matches = title.toLowerCase().includes(text.toLowerCase())

        if (node.children && node.children.length > 0) {
          const filteredChildren = filterTree(node.children, text)
          if (filteredChildren.length > 0) {
            return { ...node, children: filteredChildren }
          }
        }

        return matches ? node : null
      })
      .filter(Boolean) as TreeDataNode[]
  }

  const filteredData = searchText ? filterTree(treeData, searchText) : treeData

  if (loading) {
    return (
      <div style={styles.loading}>
        <Spin />
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Input.Search
          placeholder="搜索目录..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>

      <div style={styles.treeContainer}>
        {filteredData.length === 0 ? (
          <Empty description="暂无目录" style={{ marginTop: 40 }} />
        ) : (
          <Tree
            showIcon
            expandedKeys={expandedKeys}
            selectedKeys={selectedNode ? [selectedNode] : []}
            treeData={filteredData}
            loadData={onLoadData}
            onSelect={handleSelect}
            onExpand={handleExpand}
            style={styles.tree}
          />
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    padding: 12,
    borderBottom: '1px solid #f0f0f0'
  },
  treeContainer: {
    flex: 1,
    overflow: 'auto',
    padding: 8
  },
  tree: {
    background: 'transparent'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%'
  }
}

export default DirectoryTree