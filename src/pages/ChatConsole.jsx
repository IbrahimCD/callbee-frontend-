import React, { useState } from 'react'
import { Card, Form, Input, Button, Typography, message } from 'antd'
import api from '../api/client'
const { Text } = Typography

export default function ChatConsole() {
  const [reply, setReply] = useState('')
  const [used, setUsed] = useState(null)
  const agentId = localStorage.getItem('agentId') || ''
  const onFinish = async (v) => {
    if (!agentId) return message.warning('Create an agent first (Setup → AI Role)')
    try { const res = await api.post('/api/chat/turn', { agentId, text: v.text }); setReply(res.data.reply); setUsed(res.data.used) }
    catch (e) { message.error(e?.response?.data?.error || 'Chat failed') }
  }
  return (
    <Card title="Chat test (Bangla)">
      <Form layout="inline" onFinish={onFinish}>
        <Form.Item name="text" rules={[{ required: true }]}>
          <Input.TextArea autoSize={{minRows:1,maxRows:2}} placeholder="আপনার প্রশ্ন লিখুন…" style={{ width: 480 }} />
        </Form.Item>
        <Button type="primary" htmlType="submit">Send</Button>
      </Form>
      {reply && (<div style={{ marginTop: 16 }}>
        <Text type="secondary">Assistant reply:</Text>
        <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{reply}</div>
        {used && <pre className="pre">{JSON.stringify(used, null, 2)}</pre>}
      </div>)}
    </Card>
  )
}
