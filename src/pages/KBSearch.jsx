import React, { useState } from 'react'
import { Card, Form, Input, Button, List, Typography, message } from 'antd'
import api from '../api/client'
const { Text } = Typography
export default function KBSearch() {
  const [results, setResults] = useState([])
  const onFinish = async (v) => { try { const res = await api.get('/api/kb/search', { params:{ q: v.q } }); setResults(res.data.results) } catch { message.error('Search failed') } }
  return (
    <Card title="Knowledge Base Search">
      <Form layout="inline" onFinish={onFinish}>
        <Form.Item name="q" rules={[{ required: true }]}><Input placeholder="Ask something…" style={{ width: 360 }} /></Form.Item>
        <Button type="primary" htmlType="submit">Search</Button>
      </Form>
      <List style={{ marginTop: 16 }} bordered dataSource={results}
        renderItem={(item)=>(<List.Item><div style={{ width: '100%' }}>
          <Text type="secondary">{item.metadata?.source} — score {item.score}</Text>
          <div style={{ whiteSpace:'pre-wrap', marginTop:8 }}>{item.text}</div>
        </div></List.Item>)}/>
    </Card>
  )
}
