import React, { useState } from 'react'
import { Button, Card, Upload, message, Space, Typography } from 'antd'
import { UploadOutlined, RocketOutlined } from '@ant-design/icons'
import api from '../api/client'
const { Text } = Typography

export default function FileIngestCard() {
  const [fileId, setFileId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [ingesting, setIngesting] = useState(false)

  const props = {
    name: 'file',
    customRequest: async ({ file, onSuccess, onError }) => {
      setUploading(true)
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await api.post('/api/files/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
        setFileId(res.data.id); message.success('ফাইল আপলোড হয়েছে'); onSuccess(res.data, file)
      } catch (e) { console.error(e); message.error('আপলোড ব্যর্থ'); onError(e) }
      finally { setUploading(false) }
    }
  }
  const ingest = async () => {
    if (!fileId) return message.warning('আগে একটি ফাইল আপলোড করুন')
    setIngesting(true)
    try { const res = await api.post(`/api/files/${fileId}/ingest`); message.success(`ইনজেস্ট সম্পন্ন। চাঙ্ক: ${res.data.chunks}`) }
    catch { message.error('ইনজেস্ট ব্যর্থ') }
    finally { setIngesting(false) }
  }
  return (
    <Card title="Knowledge: PDF/DOCX/TXT Upload & Ingest" bordered>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Upload {...props} multiple={false} maxCount={1} showUploadList>
          <Button icon={<UploadOutlined />} loading={uploading}>Upload file</Button>
        </Upload>
        <div><Text type="secondary">Upload then click Ingest.</Text></div>
        <Button type="primary" icon={<RocketOutlined />} onClick={ingest} loading={ingesting} disabled={!fileId}>
          Ingest
        </Button>
      </Space>
    </Card>
  )
}
