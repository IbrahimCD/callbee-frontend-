import React, { useState } from 'react'
import { Card, Form, Input, Button, List, Typography, message } from 'antd'
import api from '../api/client'
const { Text } = Typography
export default function Inventory() {
  const [items, setItems] = useState([])
  const onFinish = async (v) => { try { const res = await api.get('/api/inventory/check', { params: v }); setItems(res.data.items || []) } catch { message.error('Lookup failed') } }
  return (
    <Card title="Inventory lookup">
      <Form layout="inline" onFinish={onFinish}>
        <Form.Item name="sku"><Input placeholder="SKU" /></Form.Item>
        <Form.Item name="name"><Input placeholder="Name" /></Form.Item>
        <Button type="primary" htmlType="submit">Search</Button>
      </Form>
      <List style={{ marginTop: 16 }} bordered dataSource={items}
        renderItem={(it)=>(<List.Item><div style={{ width: '100%' }}>
          <Text strong>{it.name}</Text> <Text type="secondary">SKU: {it.sku}</Text>
          <div>Price: {it.price} | Stock: {it.stockQty} | Category: {it.category}</div>
        </div></List.Item>)}/>
    </Card>
  )
}
