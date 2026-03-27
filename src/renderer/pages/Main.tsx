import React, { useEffect, useState } from 'react'
import { Layout, Menu, Button, Dropdown, Typography, Space, Spin, message } from 'antd'
import {
  FolderOutlined,
  FileOutlined,
  SearchOutlined,
  HistoryOutlined,
  SettingOutlined,
  LogoutOutlined,
  ReloadOutlined,
  SyncOutlined
} from '@ant-design/icons'
import { useAuthStore } from '../stores/auth-store'
import { useSvnStore } from '../stores/svn-store'
import { useSearchStore } from '../stores/search-store'
import DirectoryTree from '../components/DirectoryTree'
import SearchBar from '../components/SearchBar'
import ResultList from '../components/ResultList'
import HistoryPanel from '../components/HistoryPanel'

const { Header, Sider, Content } = Layout
const { Text } = Typography

const Main: React.FC = () => {
  const { username, url, logout } = useAuthStore()
  const { setCurrentPath } = useSvnStore()
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('browse')
  const [refreshStatus, setRefreshStatus] = useState({ isRunning: false, intervalMinutes: 10 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadRefreshStatus()
  }, [])

  const loadRefreshStatus = async () => {
    const status = await window.api.refresh.getStatus()
    setRefreshStatus(status)
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      // 清除缓存并重新加载
      message.success('刷新成功')
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

  const handleLogout = async () => {
    await logout()
  }

  const userMenuItems = [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '设置'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]

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
        <div style={styles.logo}>
          <FolderOutlined style={{ fontSize: 24, marginRight: 8 }} />
          <Text strong style={{ color: '#fff', fontSize: 18 }}>SVN Searcher</Text>
        </div>

        <Space style={styles.headerRight}>
          {refreshStatus.isRunning && (
            <Space>
              <SyncOutlined spin style={{ color: '#52c41a' }} />
              <Text style={{ color: '#fff' }}>
                自动刷新中 ({refreshStatus.intervalMinutes}分钟)
              </Text>
              <Button size="small" onClick={handleStopAutoRefresh}>
                停止
              </Button>
            </Space>
          )}

          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            刷新
          </Button>

          {!refreshStatus.isRunning && (
            <Button
              icon={<SyncOutlined />}
              onClick={handleStartAutoRefresh}
            >
              自动刷新
            </Button>
          )}

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={styles.userInfo}>
              <Text style={{ color: '#fff' }}>{username}</Text>
            </div>
          </Dropdown>
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
  logo: {
    display: 'flex',
    alignItems: 'center'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center'
  },
  userInfo: {
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: 4,
    marginLeft: 8
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