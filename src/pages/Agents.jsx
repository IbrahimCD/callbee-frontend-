import React, { useEffect, useState } from 'react'
import { Card, List, Typography, message } from 'antd'
import api from '../api/client'
const { Text } = Typography
export default function Agents() {
  const [agents, setAgents] = useState([])
  useEffect(()=>{ api.get('/api/agents').then(res=> setAgents(res.data)).catch(()=> message.error('Failed to load agents')) }, [])
  return (
    <Card title="Your Agents">
      <List bordered dataSource={agents}
        renderItem={(a)=>(<List.Item><div style={{ width: '100%' }}>
          <Text strong>{a.name}</Text> <Text type="secondary">({a.tone})</Text>
          <div>{a.welcomeMessageBn}</div>
        </div></List.Item>)}/>
    </Card>
  )
}
