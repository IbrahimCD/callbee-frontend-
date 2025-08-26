import React, { useState, useEffect } from 'react'
import { Steps, Card, Form, Input, Button, message, Select, Space, Typography, Divider, Alert } from 'antd'
import api from '../api/client'
import FileIngestCard from '../components/FileIngestCard'
const { Step } = Steps; const { Title, Text } = Typography

export default function SetupWizard() {
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [existingData, setExistingData] = useState({})
  const [completedSteps, setCompletedSteps] = useState(new Set())
  
  const next = () => setCurrent(c=>c+1)
  const prev = () => setCurrent(c=>c-1)
  
  // Load existing data on component mount
  useEffect(() => {
    loadExistingData()
  }, [])
  
  const loadExistingData = async () => {
    setLoading(true)
    try {
      const [phoneRes, keyRes, agentRes] = await Promise.all([
        api.get('/api/setup/phone').catch(() => ({ data: {} })),
        api.get('/api/setup/provider-key').catch(() => ({ data: {} })),
        api.get('/api/setup/agent').catch(() => ({ data: {} }))
      ])
      
      const data = {
        phone: phoneRes.data,
        providerKey: keyRes.data,
        agent: agentRes.data
      }
      
      setExistingData(data)
      
      // Mark completed steps
      const completed = new Set()
      if (data.phone.numberE164) completed.add(0)
      if (data.providerKey.hasKey) completed.add(1)
      if (data.agent.name) completed.add(2)
      setCompletedSteps(completed)
      
    } catch (e) {
      console.error('Failed to load existing data:', e)
    } finally {
      setLoading(false)
    }
  }
  
  const markStepComplete = (stepIndex) => {
    setCompletedSteps(prev => new Set([...prev, stepIndex]))
  }
  
  const canAccessStep = (stepIndex) => {
    // Allow access to any step if user has completed setup before
    if (completedSteps.size > 0) return true
    // Otherwise, require sequential completion
    return stepIndex === 0 || completedSteps.has(stepIndex - 1)
  }

  const PhoneStep = () => {
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)
    
    useEffect(() => {
      if (existingData.phone?.numberE164) {
        form.setFieldsValue(existingData.phone)
      }
    }, [existingData.phone, form])
    
    const onFinish = async (v) => { 
      setSaving(true)
      try { 
        await api.post('/api/setup/phone', v)
        message.success(existingData.phone?.numberE164 ? 'Phone updated' : 'Phone saved')
        markStepComplete(0)
        await loadExistingData()
        if (!existingData.phone?.numberE164) next()
      } catch(e) { 
        message.error(e?.response?.data?.error || 'Failed') 
      } finally {
        setSaving(false)
      }
    }
    
    const isEditing = !!existingData.phone?.numberE164
    
    return (<Card title={`Step 1 — ${isEditing ? 'Edit' : 'Add'} phone number`}>
      {isEditing && <Alert message="Phone number already configured. You can update the details below." type="info" style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={onFinish} form={form} initialValues={{ label: 'Sales' }}>
        <Form.Item name="numberE164" label="Phone number (E.164)" rules={[{ required: true }]}><Input placeholder="+8801XXXXXXXXX" /></Form.Item>
        <Form.Item name="label" label="Label"><Input placeholder="Sales / Support" /></Form.Item>
        <Form.Item name="fallbackNumber" label="Fallback human number (optional)"><Input placeholder="+8801XXXXXXXXX" /></Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          {isEditing ? 'Update Phone' : 'Save & Continue'}
        </Button>
      </Form></Card>)
  }
  
  const KeyStep = () => {
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)
    
    const onFinish = async (v) => { 
      setSaving(true)
      try { 
        await api.post('/api/setup/provider-key', { apiKey: v.apiKey })
        message.success(existingData.providerKey?.hasKey ? 'OpenAI key updated' : 'OpenAI key stored')
        markStepComplete(1)
        await loadExistingData()
        if (!existingData.providerKey?.hasKey) next()
      } catch(e) { 
        message.error(e?.response?.data?.error||'Failed') 
      } finally {
        setSaving(false)
      }
    }
    
    const isEditing = !!existingData.providerKey?.hasKey
    
    return (<Card title={`Step 2 — ${isEditing ? 'Update' : 'Add'} ChatGPT/OpenAI API key`}>
      {isEditing && <Alert message="OpenAI API key already configured. You can update it below." type="info" style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={onFinish} form={form}>
        <Form.Item name="apiKey" label="OpenAI API Key" rules={[{ required: true }]}><Input.Password placeholder="sk-..." /></Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          {isEditing ? 'Update Key' : 'Save & Continue'}
        </Button>
      </Form></Card>)
  }
  
  const AgentStep = () => {
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)
    
    useEffect(() => {
      if (existingData.agent?.name) {
        form.setFieldsValue({
          ...existingData.agent,
          rules: existingData.agent.rules?.join('\n') || ''
        })
      }
    }, [existingData.agent, form])
    
    const onFinish = async (v) => {
      setSaving(true)
      try {
        const res = await api.post('/api/setup/agent', {
          id: existingData.agent?._id,
          name: v.name, 
          welcomeMessageBn: v.welcomeMessageBn, 
          tone: v.tone, 
          voice: v.voice,
          rules: v.rules ? v.rules.split('\n').map(s => s.trim()).filter(Boolean) : []
        })
        localStorage.setItem('agentId', res.data._id)
        message.success(existingData.agent?.name ? 'Agent updated' : 'Agent saved')
        markStepComplete(2)
        await loadExistingData()
        if (!existingData.agent?.name) next()
      } catch (e) { 
        message.error(e?.response?.data?.error || 'Failed') 
      } finally {
        setSaving(false)
      }
    }
    
    const isEditing = !!existingData.agent?.name
    
    return (<Card title={`Step 3 — ${isEditing ? 'Edit' : 'Configure'} AI Role`}>
      {isEditing && <Alert message="AI Agent already configured. You can update the settings below." type="info" style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={onFinish} form={form}
        initialValues={{ tone:'formal', voice:'Google.bn-IN-Wavenet-D', welcomeMessageBn: 'হ্যালো, আমি শাথি। কীভাবে সাহায্য করতে পারি?' }}>
        <Form.Item name="name" label="Agent name" rules={[{ required: true }]}><Input placeholder="Shathi" /></Form.Item>
        <Form.Item name="welcomeMessageBn" label="Welcome message (Bangla)" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
        <Form.Item name="tone" label="Tone"><Select options={[{label:'Formal', value:'formal'},{label:'Informal', value:'informal'}]} /></Form.Item>
        <Form.Item name="voice" label="Voice"><Input placeholder="Google.bn-IN-Wavenet-D" /></Form.Item>
        <Form.Item name="rules" label="Rules (one per line)"><Input.TextArea rows={4} placeholder="স্টক/দাম কেবল ডাটাবেস দেখে বলবে" /></Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>
          {isEditing ? 'Update Agent' : 'Save & Continue'}
        </Button>
      </Form></Card>)
  }
  
  const KnowledgeStep = () => {
    const [csvUploading, setCsvUploading] = useState(false)
    const [csvFileName, setCsvFileName] = useState('')
    const [selectedFile, setSelectedFile] = useState(null)
    
    const uploadCSV = async () => {
      if (!selectedFile) {
        message.warning('Please select a CSV file first')
        return
      }
      
      setCsvUploading(true)
      try {
        const form = new FormData()
        form.append('file', selectedFile)
        const res = await api.post('/api/files/inventory/upload-csv', form, { 
          headers: { 'Content-Type': 'multipart/form-data' } 
        })
        message.success(`CSV uploaded successfully! ${res.data.rows} items imported.`)
        setCsvFileName(selectedFile.name)
        setSelectedFile(null)
      } catch (e) {
        console.error('CSV upload error:', e)
        message.error(e?.response?.data?.error || 'Failed to upload CSV')
      } finally {
        setCsvUploading(false)
      }
    }
    
    return (<Card title="Step 4 — Upload knowledge & inventory">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <FileIngestCard />
        <Divider />
        <Title level={5}>Inventory (CSV)</Title>
        <Space>
          <input 
            type="file" 
            accept=".csv" 
            onChange={(e) => { 
              const f = e.target.files?.[0]
              if (f) {
                setSelectedFile(f)
                setCsvFileName('')
              }
            }} 
          />
          <Button 
            loading={csvUploading} 
            onClick={uploadCSV}
            disabled={!selectedFile}
          >
            Upload CSV
          </Button>
          {csvFileName && <Text type="secondary">{csvFileName}</Text>}
        </Space>
      </Space></Card>)
  }
  
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading setup data...</div>
  }
  
  const steps = [
    { title: 'Phone', content: <PhoneStep /> },
    { title: 'OpenAI Key', content: <KeyStep /> },
    { title: 'AI Role', content: <AgentStep /> },
    { title: 'Knowledge', content: <KnowledgeStep /> },
  ]
  
  return (<>
    <Steps 
      current={current} 
      items={steps.map((s, index) => ({ 
        title: s.title,
        status: completedSteps.has(index) ? 'finish' : 'wait'
      }))} 
      style={{ marginBottom: 24 }}
      onChange={setCurrent}
    />
    <div>{steps[current].content}</div>
    <div style={{ marginTop: 16 }}>
      {current > 0 && <Button onClick={() => setCurrent(c => c - 1)} style={{ marginRight: 8 }}>Back</Button>}
      {current < steps.length - 1 && <Button type="primary" onClick={() => setCurrent(c => c + 1)} style={{ marginRight: 8 }}>Next</Button>}
      {current === steps.length - 1 && <Button type="primary" onClick={() => message.success('Setup complete!')}>Finish</Button>}
    </div>
  </>)
}
