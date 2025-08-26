import React from 'react'
import { Card, Form, Input, Button, Typography, Divider, message } from 'antd'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate, Link } from 'react-router-dom'
const { Title, Text } = Typography
export default function Register() {
  const { register, loading } = useAuth()
  const nav = useNavigate()
  const onFinish = async (v) => {
    try { await register(v.email, v.password); message.success('Account created'); nav('/') }
    catch (e) { message.error(e?.response?.data?.error || 'Registration failed') }
  }
  return (
    <div className="centered">
      <Card style={{ width: 420 }}>
        <Title level={3}>Create account</Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>Create account</Button>
        </Form>
        <Divider />
        <Text>Already have an account? <Link to="/login">Sign in</Link></Text>
      </Card>
    </div>
  )
}
