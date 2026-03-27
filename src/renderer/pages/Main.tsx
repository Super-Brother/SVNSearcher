import React, { useEffect, useState } from 'react'
import { Layout, Menu, Button, Dropdown, Typography, Space, Spin, message, Select, Tag } from 'antd'
import {
  FolderOutlined,
  SearchOutlined,
  HistoryOutlined,
  SettingOutlined,
  LogoutOutlined,
  ReloadOutlined,
  SyncOutlined,
  DatabaseOutlined,
  DownOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../stores/auth-store'
import DirectoryTree from '../components/DirectoryTree'
import SearchBar from '../components/SearchBar'
import ResultList from '../components/ResultList'
import HistoryPanel from '../components/HistoryPanel'
import SettingsModal from '../components/SettingsModal'

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface Repository {
  id: string
  name: string
  url: string
  username: string
  password: string
  lastLogin?: string
}

const Main: React.FC = () => {
  const { username, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('browse')
  const [refreshStatus, setRefreshStatus] = useState({ isRunning: false, intervalMinutes: 10 })
  const [loading, setLoading] = useState(false)
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [currentRepo, setCurrentRepo] = useState<Repository | null>(null)

  useEffect(() => {
    loadRefreshStatus()
    loadRepositories()
  }, [])

  const loadRefreshStatus = async () => {
    const status = await window.api.refresh.getStatus()
    setRefreshStatus(status)
  }

  const loadRepositories = () => {
    try {
      const reposStr = localStorage.getItem('svn-repositories')
      if (reposStr) {
        const repos: Repository[] = JSON.parse(reposStr)
        setRepositories(repos)
        // 找到当前激活的仓库
        const current = repos.find(r => r.lastLogin) || repos[0]
        if (current) {
          setCurrentRepo(current)
        }
      }
    } catch (error) {
      console.error('加载仓库列表失败:', error)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const result = await window.api.index.start()
      if (result.success) {
        message.success(`刷新成功，共 ${result.count} 个条目`)
      } else {
        message.error(result.error || '刷新失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStartAutoRefresh = async () => {
    await window.api.refresh.start(10)
    await loadRefreshStatus()
    message.success('已启动自动刷新')
  }

  const handleStopAutoRefresh = async () => {
    await window.api.refresh.stop()
    await loadRefreshStatus()
    message.info('已停止自动刷新')
  }

  const handleSwitchRepo = async (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId)
    if (!repo) return

    setLoading(true)
    try {
      const { login } = useAuthStore.getState()
      const success = await login(repo.url, repo.username, repo.password)
      if (success) {
        // 更新最后登录时间
        const updatedRepos = repositories.map(r => ({
          ...r,
          lastLogin: r.id === repo.id ? new Date().toISOString() : r.lastLogin
        }))
        setRepositories(updatedRepos)
        setCurrentRepo(repo)
        localStorage.setItem('svn-repositories', JSON.stringify(updatedRepos))
        message.success(`已切换到: ${repo.name}`)
      } else {
        message.error('切换仓库失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const handleSettingsClick = () => {
    setSettingsVisible(true)
  }

  const handleSettingsClose = () => {
    setSettingsVisible(false)
    loadRepositories() // 刷新仓库列表
  }

  // 仓库选择下拉
  const repoSelect = (
    <div style={styles.repoSelector}>
      <DatabaseOutlined style={{ marginRight: 8 }} />
      <Select
        value={currentRepo?.id}
        style={{ minWidth: 200 }}
        onChange={handleSwitchRepo}
        loading={loading}
        suffixIcon={<DownOutlined style={{ fontSize: 10 }} />}
        options={repositories.map(r => ({
          value: r.id,
          label: (
            <Space>
              <span>{r.name}</span>
              {r.id === currentRepo?.id && <Tag color="green" style={{ fontSize: 10 }}>当前</Tag>}
            </Space>
          )
        }))}
      />
    </div>
  )

  const sidebarItems = [
    {
      key: 'browse',
      icon: <FolderOutlined />,
      label: '目录浏览'
    },
    {
      key: 'search',
      icon: <SearchOutlined />,
      label: '搜索'
    },
    {
      key: 'history',
      icon: <HistoryOutlined />,
      label: '版本历史'
    }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'browse':
        return (
          <div style={styles.contentWrapper}>
            <SearchBar />
            <div style={styles.splitContainer}>
              <div style={styles.treePane}>
                <DirectoryTree />
              </div>
              <div style={styles.resultPane}>
                <ResultList />
              </div>
            </div>
          </div>
        )
      case 'search':
        return (
          <div style={styles.contentWrapper}>
            <SearchBar />
            <ResultList fullPage />
          </div>
        )
      case 'history':
        return (
          <div style={styles.contentWrapper}>
            <HistoryPanel />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Layout style={styles.layout}>
      <Header style={styles.header}>
        <div style={styles.leftSection}>
          <div style={styles.logo}>
            <DatabaseOutlined style={{ fontSize: 24, marginRight: 8, color: '#667eea' }} />
            <Text strong style={{ color: '#fff', fontSize: 18 }}>SVN Searcher</Text>
          </div>

          {/* 仓库选择器 */}
          {repositories.length > 0 && repoSelect}
        </div>

        <Space style={styles.headerRight}>
          {refreshStatus.isRunning && (
            <Space>
              <SyncOutlined spin style={{ color: '#52c41a' }} />
              <Text style={{ color: '#fff', fontSize: 13 }}>
                自动刷新 ({refreshStatus.intervalMinutes}分钟)
              </Text>
              <Button size="small" ghost onClick={handleStopAutoRefresh}>
                停止
              </Button>
            </Space>
          )}

          <Button
            ghost
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>

          {!refreshStatus.isRunning && (
            <Button
              ghost
              icon={<SyncOutlined />}
              onClick={handleStartAutoRefresh}
            >
              自动刷新
            </Button>
          )}

          <Button
            ghost
            icon={<SettingOutlined />}
            onClick={handleSettingsClick}
          >
            设置
          </Button>

          <Button
            ghost
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            退出
          </Button>
        </Space>
      </Header>

      <Layout>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          width={200}
          style={styles.sider}
        >
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            items={sidebarItems}
            onClick={(e) => setActiveTab(e.key)}
            style={styles.menu}
          />
        </Sider>

        <Content style={styles.content}>
          {loading ? (
            <div style={styles.loading}>
              <Spin size="large" />
            </div>
          ) : (
            renderContent()
          )}
        </Content>
      </Layout>

      <SettingsModal
        visible={settingsVisible}
        onClose={handleSettingsClose}
      />
    </Layout>
  )
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    height: '100vh'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#001529',
    padding: '0 24px'
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 24
  },
  logo: {
    display: 'flex',
    alignItems: 'center'
  },
  repoSelector: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '4px 12px',
    borderRadius: 6
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center'
  },
  sider: {
    borderRight: '1px solid #f0f0f0'
  },
  menu: {
    borderRight: 0
  },
  content: {
    padding: 16,
    background: '#f5f5f5',
    overflow: 'auto'
  },
  contentWrapper: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  splitContainer: {
    flex: 1,
    display: 'flex',
    gap: 16,
    marginTop: 16,
    overflow: 'hidden'
  },
  treePane: {
    width: 350,
    background: '#fff',
    borderRadius: 8,
    overflow: 'auto'
  },
  resultPane: {
    flex: 1,
    background: '#fff',
    borderRadius: 8,
    overflow: 'auto'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%'
  }
}

export default Main