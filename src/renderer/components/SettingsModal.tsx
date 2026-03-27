import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Button,
  Table,
  Space,
  message,
  Popconfirm,
  Card,
  Typography,
  Switch,
  Select,
  Tag,
  Divider
} from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, DatabaseOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/auth-store'

const { Text, Title } = Typography

interface Repository {
  id: string
  name: string
  url: string
  username: string
  password: string
  lastLogin?: string
}

interface SettingsModalProps {
  visible: boolean
  onClose: () => void
}

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const [repoForm] = Form.useForm()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(false)
  const [editingRepo, setEditingRepo] = useState<Repository | null>(null)
  const [showRepoModal, setShowRepoModal] = useState(false)

  // 自动刷新设置
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(10)

  // 下载路径设置
  const [downloadPath, setDownloadPath] = useState<string>('')

  useEffect(() => {
    if (visible) {
      loadSettings()
    }
  }, [visible])

  const loadSettings = async () => {
    try {
      // 加载仓库列表
      const reposStr = localStorage.getItem('svn-repositories')
      if (reposStr) {
        setRepositories(JSON.parse(reposStr))
      }

      // 加载自动刷新设置
      const status = await window.api.refresh.getStatus()
      setAutoRefreshEnabled(status.isRunning)
      setAutoRefreshInterval(status.intervalMinutes || 10)

      // 加载下载路径设置
      const settingsStr = localStorage.getItem('svn-searcher-settings')
      if (settingsStr) {
        const settings = JSON.parse(settingsStr)
        setDownloadPath(settings.downloadPath || '')
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  const saveRepositories = (repos: Repository[]) => {
    setRepositories(repos)
    localStorage.setItem('svn-repositories', JSON.stringify(repos))
  }

  const handleAddRepo = () => {
    setEditingRepo(null)
    repoForm.resetFields()
    setShowRepoModal(true)
  }

  const handleEditRepo = (repo: Repository) => {
    setEditingRepo(repo)
    repoForm.setFieldsValue({
      url: repo.url,
      username: repo.username,
      password: repo.password
    })
    setShowRepoModal(true)
  }

  const handleDeleteRepo = (repoId: string) => {
    const newRepos = repositories.filter(r => r.id !== repoId)
    saveRepositories(newRepos)
    message.success('仓库已删除')
  }

  const handleSaveRepo = async () => {
    try {
      const values = await repoForm.validateFields()

      // 验证连接
      setLoading(true)
      const result = await window.api.auth.login({
        url: values.url,
        username: values.username || '',
        password: values.password || ''
      })

      if (!result.success) {
        message.error(result.error || '连接失败，请检查仓库地址和凭证')
        return
      }

      if (editingRepo) {
        // 编辑现有仓库
        const updatedRepos = repositories.map(r =>
          r.id === editingRepo.id
            ? { ...r, ...values, name: extractRepoName(values.url) }
            : r
        )
        saveRepositories(updatedRepos)
        message.success('仓库已更新')
      } else {
        // 添加新仓库，自动从URL提取名称
        const newRepo: Repository = {
          id: Date.now().toString(),
          name: extractRepoName(values.url),
          url: values.url,
          username: values.username || '',
          password: values.password || ''
        }

        saveRepositories([...repositories, newRepo])
        message.success('仓库已添加')
      }

      setShowRepoModal(false)
      repoForm.resetFields()
    } catch (error) {
      console.error('保存仓库失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAutoRefreshChange = async (enabled: boolean) => {
    try {
      if (enabled) {
        await window.api.refresh.start(autoRefreshInterval)
        message.success('已启用自动刷新')
      } else {
        await window.api.refresh.stop()
        message.info('已停止自动刷新')
      }
      setAutoRefreshEnabled(enabled)
    } catch (error) {
      message.error('设置失败')
    }
  }

  const handleIntervalChange = async (interval: number) => {
    setAutoRefreshInterval(interval)
    if (autoRefreshEnabled) {
      await window.api.refresh.start(interval)
    }
  }

  const handleSelectDownloadPath = async () => {
    const path = await window.api.file.selectDownloadDir()
    if (path) {
      setDownloadPath(path)
      // 保存设置
      const settingsStr = localStorage.getItem('svn-searcher-settings')
      const settings = settingsStr ? JSON.parse(settingsStr) : {}
      settings.downloadPath = path
      localStorage.setItem('svn-searcher-settings', JSON.stringify(settings))
      message.success('下载路径已设置')
    }
  }

  const handleClearDownloadPath = () => {
    setDownloadPath('')
    const settingsStr = localStorage.getItem('svn-searcher-settings')
    const settings = settingsStr ? JSON.parse(settingsStr) : {}
    delete settings.downloadPath
    localStorage.setItem('svn-searcher-settings', JSON.stringify(settings))
    message.success('已使用默认下载目录')
  }

  const extractRepoName = (url: string) => {
    try {
      const pathname = new URL(url).pathname
      const lastPart = pathname.split('/').filter(Boolean).pop() || '未命名仓库'
      // 解码 URL 编码的字符
      return decodeURIComponent(lastPart)
    } catch {
      return '未命名仓库'
    }
  }

  const columns = [
    {
      title: '仓库名称',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      render: (name: string, record: Repository) => (
        <Space>
          <DatabaseOutlined style={{ color: '#667eea' }} />
          <Text strong>{name}</Text>
          {record.lastLogin && <Tag color="blue" style={{ fontSize: 10 }}>最近</Tag>}
        </Space>
      )
    },
    {
      title: '地址',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      render: (url: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{url}</Text>
      )
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 100,
      render: (text: string) => <Text style={{ fontSize: 12 }}>{text || '(匿名)'}</Text>
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: Repository) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRepo(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此仓库?"
            onConfirm={() => handleDeleteRepo(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <Modal
        title={<Space><DatabaseOutlined /> 仓库管理</Space>}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={700}
      >
        {/* 自动刷新设置 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>自动刷新</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                定时自动拉取仓库目录更新
              </Text>
            </div>
            <Space>
              {autoRefreshEnabled && (
                <Select
                  value={autoRefreshInterval}
                  style={{ width: 100 }}
                  onChange={handleIntervalChange}
                  size="small"
                  options={[
                    { value: 5, label: '5 分钟' },
                    { value: 10, label: '10 分钟' },
                    { value: 15, label: '15 分钟' },
                    { value: 30, label: '30 分钟' },
                    { value: 60, label: '1 小时' }
                  ]}
                />
              )}
              <Switch
                checked={autoRefreshEnabled}
                onChange={handleAutoRefreshChange}
              />
            </Space>
          </div>
        </Card>

        {/* 下载设置 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong>下载路径</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {downloadPath || '使用系统默认下载目录'}
              </Text>
            </div>
            <Space>
              {downloadPath && (
                <Button size="small" onClick={handleClearDownloadPath}>
                  重置
                </Button>
              )}
              <Button
                type="primary"
                size="small"
                icon={<FolderOpenOutlined />}
                onClick={handleSelectDownloadPath}
              >
                选择目录
              </Button>
            </Space>
          </div>
        </Card>

        {/* 仓库列表 */}
        <Card size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong>仓库列表 ({repositories.length})</Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRepo} size="small">
              添加仓库
            </Button>
          </div>

          {repositories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
              <DatabaseOutlined style={{ fontSize: 32, marginBottom: 8 }} />
              <br />
              <Text type="secondary">暂无仓库，点击上方按钮添加</Text>
            </div>
          ) : (
            <Table
              dataSource={repositories}
              columns={columns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          )}
        </Card>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            提示：在主页顶部可快速切换仓库
          </Text>
        </div>
      </Modal>

      {/* 添加/编辑仓库弹窗 */}
      <Modal
        title={editingRepo ? '编辑仓库' : '添加仓库'}
        open={showRepoModal}
        onOk={handleSaveRepo}
        onCancel={() => {
          setShowRepoModal(false)
          repoForm.resetFields()
        }}
        okText="保存"
        cancelText="取消"
        confirmLoading={loading}
      >
        <Form
          form={repoForm}
          layout="vertical"
        >
          <Form.Item
            name="url"
            label="SVN 仓库地址"
            rules={[{ required: true, message: '请输入 SVN 仓库地址' }]}
            extra="例如: http://svn.example.com/svn/A40-产品研发体系"
          >
            <Input placeholder="http://svn.example.com/svn/repo" />
          </Form.Item>

          <Form.Item
            name="username"
            label="用户名"
          >
            <Input placeholder="用户名（可选）" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
          >
            <Input.Password placeholder="密码（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default SettingsModal