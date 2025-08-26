import React from 'react'
import { Card, Form, Input, Button, Typography, Divider, message } from 'antd'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate, Link } from 'react-router-dom'

const { Title, Text } = Typography

export default function Login() {
  const { login, loading } = useAuth()
  const nav = useNavigate()
  const onFinish = async (v) => {
    try { await login(v.email, v.password); message.success('Logged in'); nav('/') }
    catch (e) { message.error(e?.response?.data?.error || 'Login failed') }
  }
  return (
    <div className="centered">
      <Card style={{ width: 420 }}>
        <Title level={3}>Sign in</Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}><Input.Password /></Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>Sign in</Button>
        </Form>
        <Divider />
        <Text>New here? <Link to="/register">Create an account</Link></Text>
      </Card>
    </div>
  )
}
