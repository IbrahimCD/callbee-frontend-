import React from 'react'
import { Card, Row, Col, Statistic } from 'antd'
import { FileAddOutlined, DatabaseOutlined, RobotOutlined } from '@ant-design/icons'
export default function Dashboard() {
  return (
    <Row gutter={[16,16]}>
      <Col xs={24} md={8}><Card><Statistic title="Agents" value={1} prefix={<RobotOutlined />} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Knowledge Files" value={1} prefix={<FileAddOutlined />} /></Card></Col>
      <Col xs={24} md={8}><Card><Statistic title="Inventory Items" value={0} prefix={<DatabaseOutlined />} /></Card></Col>
    </Row>
  )
}
