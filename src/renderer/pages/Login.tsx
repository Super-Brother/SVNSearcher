import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, message, Typography } from 'antd'
import { UserOutlined, LockOutlined, LinkOutlined } from '@ant-design/icons'
import { useAuthStore } from '../stores/auth-store'

const { Title, Text } = Typography

interface LoginForm {
  url: string
  username: string
  password: string
}

const Login: React.FC = () => {
  const [form] = Form.useForm()
  const { login, loading, error, checkStoredCredentials } = useAuthStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      await checkStoredCredentials()
      setChecking(false)
    }
    checkAuth()
  }, [checkStoredCredentials])

  const handleSubmit = async (values: LoginForm) => {
    const success = await login(values.url, values.username, values.password)
    if (success) {
      message.success('登录成功')
    }
  }

  if (checking) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>正在检查登录状态...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <Card style={styles.card}>
        <div style={styles.header}>
          <Title level={2} style={{ marginBottom: 8 }}>SVN Searcher</Title>
          <Text type="secondary">SVN 目录检索客户端</Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="url"
            label="SVN 服务器地址"
            rules={[
              { required: true, message: '请输入 SVN 服务器地址' },
              { type: 'url', message: '请输入有效的 URL' }
            ]}
          >
            <Input
              prefix={<LinkOutlined />}
              placeholder="https://svn.example.com/repo"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          {error && (
            <div style={styles.error}>
              <Text type="danger">{error}</Text>
            </div>
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>
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
    width: 400,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  },
  header: {
    textAlign: 'center',
    marginBottom: 24
  },
  loading: {
    color: '#fff',
    fontSize: 16
  },
  error: {
    marginBottom: 16,
    textAlign: 'center'
  }
}

export default Login