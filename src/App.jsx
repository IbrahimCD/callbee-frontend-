import React from 'react'
import { Layout, Menu } from 'antd'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import {
  AppstoreOutlined, SettingOutlined, RobotOutlined,
  DatabaseOutlined, SearchOutlined, LogoutOutlined, PhoneOutlined
} from '@ant-design/icons'

import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import SetupWizard from './pages/SetupWizard.jsx'
import Agents from './pages/Agents.jsx'
import Inventory from './pages/Inventory.jsx'
import KBSearch from './pages/KBSearch.jsx'
import ChatConsole from './pages/ChatConsole.jsx'
import VoiceCall from './pages/VoiceCall.jsx'

const { Header, Sider, Content } = Layout

function AppLayout({ children }) {
  const { logout } = useAuth()
  const loc = useLocation()
  const selected = [loc.pathname]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="dark">
        <div className="logo">Call Agent</div>
        <Menu theme="dark" mode="inline" selectedKeys={selected}>
          <Menu.Item key="/" icon={<AppstoreOutlined />}><Link to="/">Dashboard</Link></Menu.Item>
          <Menu.Item key="/setup" icon={<SettingOutlined />}><Link to="/setup">Setup Wizard</Link></Menu.Item>
          <Menu.Item key="/agents" icon={<RobotOutlined />}><Link to="/agents">Agents</Link></Menu.Item>
          <Menu.Item key="/inventory" icon={<DatabaseOutlined />}><Link to="/inventory">Inventory</Link></Menu.Item>
          <Menu.Item key="/kb" icon={<SearchOutlined />}><Link to="/kb">KB Search</Link></Menu.Item>
          <Menu.Item key="/chat" icon={<RobotOutlined />}><Link to="/chat">Chat Console</Link></Menu.Item>
          <Menu.Item key="/voice" icon={<PhoneOutlined />}><Link to="/voice">Voice Call (WebRTC)</Link></Menu.Item>
          <Menu.Item key="/logout" icon={<LogoutOutlined />} onClick={logout}>Logout</Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px' }} />
        <Content className="content-wrap">{children}</Content>
      </Layout>
    </Layout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/setup" element={<SetupWizard />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/kb" element={<KBSearch />} />
              <Route path="/chat" element={<ChatConsole />} />
              <Route path="/voice" element={<VoiceCall />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      }/>
    </Routes>
  )
}
