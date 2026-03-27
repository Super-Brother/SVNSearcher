import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, message, Typography, List, Space, Tag, Divider } from 'antd'
import { PlusOutlined, DatabaseOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/auth-store'

const { Title, Text } = Typography

interface Repository {
  id: string
  name: string
  url: string
  username: string
  password: string
  lastLogin?: string
}

const Login: React.FC = () => {
  const [form] = Form.useForm()
  const { login, loading, error } = useAuthStore()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [addingRepo, setAddingRepo] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    loadRepositories()
  }, [])

  const loadRepositories = async () => {
    try {
      // 加载仓库列表
      const reposStr = localStorage.getItem('svn-repositories')
      if (reposStr) {
        const repos = JSON.parse(reposStr)
        setRepositories(repos)

        // 如果有保存的仓库，尝试自动登录最后一个使用的
        const lastRepo = repos.find((r: Repository) => r.lastLogin) || repos[0]
        if (lastRepo) {
          const success = await login(lastRepo.url, lastRepo.username, lastRepo.password)
          if (success) {
            setChecking(false)
            return
          }
        }
      }
    } catch (error) {
      console.error('加载仓库列表失败:', error)
    }
    setChecking(false)
  }

  const handleSelectRepo = async (repo: Repository) => {
    const success = await login(repo.url, repo.username, repo.password)
    if (success) {
      // 更新最后登录时间
      const updatedRepos = repositories.map(r =>
        r.id === repo.id
          ? { ...r, lastLogin: new Date().toISOString() }
          : r
      )
      setRepositories(updatedRepos)
      localStorage.setItem('svn-repositories', JSON.stringify(updatedRepos))
    }
  }

  const handleAddRepo = async (values: any) => {
    setAddingRepo(true)
    try {
      // 先验证连接
      const result = await window.api.auth.login({
        url: values.url,
        username: values.username || '',
        password: values.password || ''
      })

      if (!result.success) {
        message.error(result.error || '连接失败，请检查仓库地址和凭证')
        return
      }

      // 保存到仓库列表，自动从URL提取名称
      const newRepo: Repository = {
        id: Date.now().toString(),
        name: extractRepoName(values.url),
        url: values.url,
        username: values.username || '',
        password: values.password || '',
        lastLogin: new Date().toISOString()
      }

      const newRepos = [...repositories, newRepo]
      setRepositories(newRepos)
      localStorage.setItem('svn-repositories', JSON.stringify(newRepos))

      form.resetFields()
      setShowAddForm(false)
      message.success('仓库添加成功')

      // 自动登录
      await login(values.url, values.username || '', values.password || '')
    } finally {
      setAddingRepo(false)
    }
  }

  const handleDeleteRepo = (repoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newRepos = repositories.filter(r => r.id !== repoId)
    setRepositories(newRepos)
    localStorage.setItem('svn-repositories', JSON.stringify(newRepos))
    message.success('仓库已删除')
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

  if (checking) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <DatabaseOutlined style={{ fontSize: 32, marginBottom: 16 }} />
          <div>正在加载...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Card style={styles.card}>
        <div style={styles.header}>
          <DatabaseOutlined style={{ fontSize: 36, color: '#667eea', marginBottom: 8 }} />
          <Title level={2} style={{ marginBottom: 4 }}>SVN Searcher</Title>
          <Text type="secondary">SVN 目录检索客户端</Text>
        </div>

        {error && (
          <div style={styles.error}>
            <Text type="danger">{error}</Text>
          </div>
        )}

        {/* 有仓库时显示列表 */}
        {repositories.length > 0 && !showAddForm ? (
          <>
            <div style={styles.sectionHeader}>
              <Text strong>选择仓库</Text>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowAddForm(true)}
              >
                添加仓库
              </Button>
            </div>

            <List
              dataSource={repositories}
              style={{ marginTop: 16 }}
              renderItem={(repo) => (
                <List.Item
                  style={styles.repoItem}
                  onClick={() => handleSelectRepo(repo)}
                >
                  <div style={styles.repoContent}>
                    <div style={styles.repoName}>
                      <DatabaseOutlined style={{ marginRight: 8, color: '#667eea' }} />
                      <Text strong>{repo.name}</Text>
                      {repo.lastLogin && (
                        <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>最近使用</Tag>
                      )}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 24 }}>
                      {repo.url}
                      {repo.username && ` · ${repo.username}`}
                    </Text>
                  </div>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => handleDeleteRepo(repo.id, e)}
                  />
                </List.Item>
              )}
            />
          </>
        ) : (
          /* 添加仓库表单 */
          <>
            {repositories.length > 0 && (
              <Button
                type="link"
                onClick={() => setShowAddForm(false)}
                style={{ marginBottom: 16, paddingLeft: 0 }}
              >
                ← 返回仓库列表
              </Button>
            )}

            <div style={styles.formHeader}>
              <Text strong style={{ fontSize: 16 }}>
                {repositories.length === 0 ? '首次使用，请配置仓库' : '添加新仓库'}
              </Text>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleAddRepo}
              autoComplete="off"
              style={{ marginTop: 16 }}
            >
              <Form.Item
                name="url"
                label="SVN 仓库地址"
                rules={[
                  { required: true, message: '请输入 SVN 仓库地址' }
                ]}
                extra="例如: http://svn.example.com/svn/A40-产品研发体系"
              >
                <Input
                  placeholder="http://svn.example.com/svn/repo"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="username"
                label="用户名"
              >
                <Input
                  placeholder="用户名（可选）"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
              >
                <Input.Password
                  placeholder="密码（可选）"
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginTop: 24 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={addingRepo}
                  size="large"
                  block
                >
                  {repositories.length === 0 ? '添加并连接' : '添加仓库'}
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
      </Card>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  card: {
    width: 480,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    borderRadius: 12
  },
  header: {
    textAlign: 'center',
    marginBottom: 24
  },
  loading: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center'
  },
  error: {
    marginBottom: 16,
    padding: 12,
    background: '#fff2f0',
    borderRadius: 8,
    textAlign: 'center'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  formHeader: {
    marginTop: 8
  },
  repoItem: {
    cursor: 'pointer',
    borderRadius: 8,
    padding: '16px',
    marginBottom: 8,
    background: '#f5f5f5',
    transition: 'all 0.2s',
    border: '1px solid transparent'
  },
  repoContent: {
    flex: 1
  },
  repoName: {
    display: 'flex',
    alignItems: 'center'
  }
}

export default Login