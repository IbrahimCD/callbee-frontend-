// call-agent-frontend/src/pages/VoiceCall.jsx
import React, { useEffect, useRef, useState } from 'react'
import { Card, Button, Space, Typography, message, Alert, Switch } from 'antd'
import api from '../api/client'

const { Text } = Typography

/**
 * VoiceCall.jsx
 * - Starts a WebRTC session with OpenAI Realtime using an ephemeral key from /api/realtime/session
 * - Registers a client-side tool: check_inventory({ sku?: string, name?: string })
 * - When the model calls the tool, we call our backend /api/inventory/check and send the result back to the model via function_call_output
 * - The model then continues speaking in Bangla with the factual inventory info
 */
export default function VoiceCall() {
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [logs, setLogs] = useState([])
  const [vad, setVad] = useState(true)
  const localAudioRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const pcRef = useRef(null)
  const dcRef = useRef(null)
  const mediaStreamRef = useRef(null)

  // tool-call buffers keyed by call_id
  const toolBufferRef = useRef({})

  const addLog = (s) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${s}`])

  const getIceServers = () => {
    const url = import.meta.env.VITE_TURN_URL
    const username = import.meta.env.VITE_TURN_USERNAME
    const credential = import.meta.env.VITE_TURN_CREDENTIAL
    const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }]
    if (url && username && credential) iceServers.push({ urls: url, username, credential })
    return iceServers
  }

  const CHECK_INVENTORY_TOOL = {
    type: 'function',
    name: 'check_inventory',
    description: 'Check if a product is in stock. Use this when asked about product availability.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Product name to search for' }
      },
      required: ['name']
    }
  }

  const SEARCH_KB_TOOL = {
    type: 'function',
    name: 'search_kb',
    description: 'Search knowledge base for business policies and information.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' }
      },
      required: ['query']
    }
  }

  async function startCall() {
    const agentId = localStorage.getItem('agentId')
    if (!agentId) return message.warning('Create an agent first in Setup → AI Role')

    try {
      setConnecting(true); addLog('Requesting ephemeral session...')
      const sessionRes = await api.post('/api/realtime/session', { agentId })
      const { client_secret, model } = sessionRes.data
      const EPHEMERAL_KEY = client_secret?.value
      if (!EPHEMERAL_KEY) throw new Error('No ephemeral key returned')

      // WebRTC
      const pc = new RTCPeerConnection({ iceServers: getIceServers() })
      pcRef.current = pc

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = ms
      localAudioRef.current.srcObject = ms
      for (const track of ms.getTracks()) pc.addTrack(track, ms)

      pc.ontrack = (event) => {
        const [stream] = event.streams
        remoteAudioRef.current.srcObject = stream
      }

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc

      dc.onopen = () => {
        addLog('Data channel open')
        // Register Bangla settings + **tools** at session-level so server-VAD responses can call them
        const sessionUpdate = {
          type: 'session.update',
          session: {
            instructions: 'আপনি একজন ব্যবসায়িক সহকারী। আপনার কাছে check_inventory এবং search_kb নামে দুটি টুল আছে। যখন কেউ পণ্য সম্পর্কে জিজ্ঞাসা করে, তখন অবশ্যই check_inventory টুল ব্যবহার করুন। যখন কেউ নীতিমালা সম্পর্কে জিজ্ঞাসা করে, তখন search_kb টুল ব্যবহার করুন। আপনি সরাসরি উত্তর দেবেন না - প্রথমে টুল ব্যবহার করুন।',
            input_audio_transcription: { enabled: true, language: 'bn' },
            turn_detection: vad ? { type: 'server_vad', threshold: 0.5, create_response: true, interrupt_response: true } : null,
            tools: [CHECK_INVENTORY_TOOL, SEARCH_KB_TOOL],
            tool_choice: 'auto'
          }
        }
        addLog('Sending session update with tools...')
        addLog('Tools to register: ' + JSON.stringify([CHECK_INVENTORY_TOOL.name, SEARCH_KB_TOOL.name]))
        dc.send(JSON.stringify(sessionUpdate))
        addLog('Session update sent successfully')
      }

      dc.onmessage = async (ev) => {
        let msg
        try { msg = JSON.parse(ev.data) } catch { return }
        const t = msg.type
        if (!t) return
        
        // Debug: Log all message types
        addLog(`Message type: ${t}`)
        if (msg.item) addLog(`Item type: ${msg.item.type}`)

        // 1) the server adds a function_call item
        if (t === 'response.output_item.added' || t === 'response.output_item.add') {
          const item = msg.item || msg.output_item || msg
          if (item?.type === 'function_call') {
            toolBufferRef.current[item.id] = { name: item.name, arguments: '' }
            addLog(`Tool call started: ${item.name} (${item.id})`)
          }
          if (item?.type === 'text') {
            addLog(`AI response: ${item.text || 'No text'}`)
          }
        }

        // 2) arguments stream in deltas
        if (t === 'response.function_call.arguments.delta') {
          const id = msg.call_id || msg.item_id || msg.id
          if (id && toolBufferRef.current[id]) {
            toolBufferRef.current[id].arguments += (msg.delta || msg.arguments || '')
          }
        }

        // 3) arguments complete → execute tool, send function_call_output, then ask model to speak
        if (t === 'response.function_call.arguments.done') {
          const id = msg.call_id || msg.item_id || msg.id
          const buf = toolBufferRef.current[id]
          if (!buf) return
          let args = {}
          try { args = JSON.parse(buf.arguments || '{}') } catch (e) { addLog('Failed to parse tool args JSON') }
          const name = buf.name

          if (name === 'check_inventory') {
            try {
              addLog(`Executing check_inventory with args: ${JSON.stringify(args)}`)
              const params = new URLSearchParams()
              if (args.name) params.append('name', args.name)
              const res = await api.get('/api/inventory/check', { params })
              const items = res.data.items || []
              addLog(`Inventory results: ${items.length} item(s)`)

              // Send function output to the model
              const output = JSON.stringify({ items: items.map(it => ({
                sku: it.sku, name: it.name, price: it.price, stockQty: it.stockQty, location: it.location
              })) })
              const functionResult = {
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: id,
                  output
                }
              }
              dc.send(JSON.stringify(functionResult))
              addLog('Sent function result to AI')
              // tell the model to continue the response (speak) using this tool result
              dc.send(JSON.stringify({ type: 'response.create' }))
            } catch (e) {
              addLog('Inventory tool failed: ' + (e?.message || 'unknown'))
              const functionResult = { type: 'conversation.item.create', item: { type: 'function_call_output', call_id: id, output: JSON.stringify({ items: [] }) } }
              dc.send(JSON.stringify(functionResult))
              dc.send(JSON.stringify({ type: 'response.create' }))
            }
          }

          if (name === 'search_kb') {
            try {
              addLog(`Executing search_kb with args: ${JSON.stringify(args)}`)
              const params = new URLSearchParams()
              if (args.query) params.append('q', args.query)
              const res = await api.get('/api/kb/search', { params })
              const chunks = res.data.results || []
              addLog(`KB search results: ${chunks.length} chunk(s)`)

              // Send function output to the model
              const output = JSON.stringify({ 
                chunks: chunks.map(chunk => ({
                  text: chunk.text,
                  source: chunk.metadata?.source || 'document',
                  score: chunk.score
                }))
              })
              const functionResult = {
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: id,
                  output
                }
              }
              dc.send(JSON.stringify(functionResult))
              addLog('Sent KB search result to AI')
              // tell the model to continue the response (speak) using this tool result
              dc.send(JSON.stringify({ type: 'response.create' }))
            } catch (e) {
              addLog('KB search tool failed: ' + (e?.message || 'unknown'))
              const functionResult = { type: 'conversation.item.create', item: { type: 'function_call_output', call_id: id, output: JSON.stringify({ chunks: [] }) } }
              dc.send(JSON.stringify(functionResult))
              dc.send(JSON.stringify({ type: 'response.create' }))
            }
          }

          delete toolBufferRef.current[id]
        }
      }

      // SDP Offer/Answer
      const offer = await pc.createOffer({ offerToReceiveAudio: true })
      await pc.setLocalDescription(offer)

      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${EPHEMERAL_KEY}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp
      })
      const answer = { type: 'answer', sdp: await sdpResponse.text() }
      await pc.setRemoteDescription(answer)
      setConnected(true); setConnecting(false); addLog('WebRTC connected. You can speak now.')

    } catch (e) {
      console.error(e)
      message.error(e.message || 'Failed to start call')
      setConnecting(false)
      cleanup()
    }
  }

  function cleanup() {
    try { dcRef.current?.close() } catch {}
    try { pcRef.current?.close() } catch {}
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t=> t.stop()) }
    setConnected(false)
  }

  useEffect(()=> () => cleanup(), [])

  return (
    <Card title="Browser Voice Call (WebRTC) — Bangla + LIVE Inventory + Knowledge Base">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert type="success" showIcon
          message="Now wired: When you ask about stock/price, the voice agent calls your inventory in real time."
          description="Example to say: ‘আপনাদের কাছে Samsung A14 আছে?’"
        />
        <Space wrap>
          <Button type="primary" onClick={startCall} loading={connecting} disabled={connected}>Start Call</Button>
          <Button danger onClick={cleanup} disabled={!connected}>End Call</Button>
          <span><Text type="secondary">Server VAD:</Text> <Switch checked={vad} onChange={setVad} /></span>
        </Space>
        <div>
          <Text type="secondary">Local mic:</Text><br />
          <audio ref={localAudioRef} autoPlay muted />
        </div>
        <div>
          <Text type="secondary">Remote AI voice:</Text><br />
          <audio ref={remoteAudioRef} autoPlay />
        </div>
        <div>
          <Text type="secondary">Events:</Text>
          <pre style={{ background:'#f6f8fa', border:'1px solid #eee', borderRadius:6, padding:12, maxHeight: 260, overflow:'auto' }}>{logs.join('\n')}</pre>
        </div>
      </Space>
    </Card>
  )
}
