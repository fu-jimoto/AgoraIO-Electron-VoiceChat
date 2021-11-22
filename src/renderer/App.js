import React, { Component } from 'react';
import AgoraRtcEngine from 'agora-electron-sdk';
import { List } from 'immutable';
import path from 'path';
import os from 'os'

import desktopCapturer from 'electron'

import {voiceChangerList, voiceReverbPreset, videoProfileList, audioProfileList, audioScenarioList, SHARE_ID, RTMP_URL, voiceReverbList } from '../utils/settings'
import {readImage} from '../utils/base64'

export default class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      appid: 'YOUR APPID',
      token: '',
      local: '',
      users: [],
      channel: 'voicebar',
      role: 1,
      audioDevices: [],
      audioPlaybackDevices: [],
      mic: 0,
      speaker: 0
    }
  }

  getRtcEngine() {
    if(!this.state.appid){
      alert("Please enter appid")
      return
    }
    if(!this.rtcEngine) {
      this.rtcEngine = new AgoraRtcEngine()
      this.rtcEngine.initialize(this.state.appid)
      this.subscribeEvents(this.rtcEngine)
      window.rtcEngine = this.rtcEngine;
      this.setState({
        audioDevices: rtcEngine.getAudioRecordingDevices(),
        audioPlaybackDevices: rtcEngine.getAudioPlaybackDevices(),
      })
    }
    return this.rtcEngine
  }

  componentDidMount() {
  }

  subscribeEvents = (rtcEngine) => {
    rtcEngine.on('joinedchannel', (channel, uid, elapsed) => {
      console.log(`onJoinChannel channel: ${channel}  uid: ${uid}  version: ${JSON.stringify(rtcEngine.getVersion())})`)
      this.setState({
        local: uid
      });
    });
    rtcEngine.on('userjoined', (uid, elapsed) => {
      console.log(`userJoined ---- ${uid}`)
      rtcEngine.muteRemoteVideoStream(uid, false)
      this.setState({
        users: this.state.users.concat([uid])
      })
    })
    rtcEngine.on('removestream', (uid, reason) => {
      console.log(`useroffline ${uid}`)
      this.setState({
        users: this.state.users.filter(u => u != uid)
      })
    })
    rtcEngine.on('leavechannel', (rtcStats) => {
      console.log(`onleaveChannel----`)
      this.sharingPrepared = false
      this.setState({
        local: '',
        users: []
      })
    })
    rtcEngine.on('audiodevicestatechanged', () => {
      this.setState({
        audioDevices: rtcEngine.getAudioRecordingDevices(),
        audioPlaybackDevices: rtcEngine.getAudioPlaybackDevices()
      })
    })

    rtcEngine.on('audiovolumeindication', (
      uid,
      volume,
      speakerNumber,
      totalVolume
    ) => {
      console.log(`uid${uid} volume${volume} speakerNumber${speakerNumber} totalVolume${totalVolume}`)
    })
    rtcEngine.on('error', err => {
      console.error(err)
    })
    rtcEngine.on('executefailed', funcName => {
      console.error(funcName, 'failed to execute')
    })
  }

  handleJoin = () => {
    if(!this.state.channel){
      alert("Please enter channel")
      return
    }
    let rtcEngine = this.getRtcEngine()
    rtcEngine.setChannelProfile(1)
    rtcEngine.setClientRole(1)
    rtcEngine.setAudioProfile(0, 1)
    rtcEngine.disableVideo();

    if(this.state.audioDevices.length > 0) {
      rtcEngine.setAudioRecordingDevice(this.state.audioDevices[this.state.mic].deviceid);
    }
    if(this.state.audioPlaybackDevices.length > 0) {
      rtcEngine.setAudioPlaybackDevice(this.state.audioDevices[this.state.speaker].deviceid);
    }

    rtcEngine.enableAudioVolumeIndication(1000, 3, false)
    rtcEngine.joinChannel(this.state.token || null, this.state.channel, '',  Number(`${new Date().getTime()}`.slice(7)))
  }

  handleLeave = () => {
    let rtcEngine = this.getRtcEngine()
    rtcEngine.leaveChannel()
  }

  handleMute = () => {
    let rtcEngine = this.getRtcEngine()
    rtcEngine.muteLocalAudioStream(true)
  }

  handleUnMute = () => {
    let rtcEngine = this.getRtcEngine()
    rtcEngine.muteLocalAudioStream(false)
  }

  handleMicChange = e => {
    this.setState({mic: e.currentTarget.value});
    this.getRtcEngine().setAudioRecordingDevice(this.state.audioDevices[e.currentTarget.value].deviceid);
  }

  handleSpeakerChange = e => {
    this.setState({speaker: e.currentTarget.value});
    this.getRtcEngine().setAudioPlaybackDevice(this.state.audioPlaybackDevices[e.currentTarget.value].deviceid);
  }

  handleRelease = () => {
    this.setState({
      localVideoSource: "",
      users: [],
      localSharing: false,
      local: ''
    })
    if(this.rtcEngine) {
      this.sharingPrepared = false
      this.rtcEngine.release();
      this.rtcEngine = null;
    }
  }

  render() {

    return (
      <div className="" style={{padding: "20px", height: '100%', margin: '0'}}>
        <div className="column is-one-quarter" style={{overflowY: 'auto'}}>
          <div className="field">
            <label className="label">App ID</label>
            <div className="control">
              <input onChange={e => this.setState({appid: e.currentTarget.value})} value={this.state.appid} className="input" type="text" placeholder="APP ID" />
            </div>
          </div>
          <div className="field">
            <label className="label">Channel</label>
            <div className="control">
              <input onChange={e => this.setState({channel: e.currentTarget.value})} value={this.state.channel} className="input" type="text" placeholder="Input a channel name" />
            </div>
          </div>
          <div className="field">
            <label className="label">Microphone</label>
            <div className="control">
              <div className="select"  style={{width: '100%'}}>
                <select onChange={this.handleMicChange} value={this.state.mic} style={{width: '100%'}}>
                  {this.state.audioDevices.map((item, index) => (<option key={index} value={index}>{item.devicename}</option>))}
                </select>
              </div>
            </div>
          </div>
          <div className="field">
            <label className="label">Loudspeaker</label>
            <div className="control">
              <div className="select"  style={{width: '100%'}}>
                <select onChange={this.handleSpeakerChange} value={this.state.speaker} style={{width: '100%'}}>
                  {this.state.audioPlaybackDevices.map((item, index) => (<option key={index} value={index}>{item.devicename}</option>))}
                </select>
              </div>
            </div>
          </div>
          <div className="field is-grouped is-grouped-right">
            <div className="control">
              <button onClick={this.handleJoin} className="button is-link">Join</button>
            </div>
            <div className="control">
              <button onClick={this.handleMute} className="button is-link">Mute</button>
            </div>
            <div className="control">
              <button onClick={this.handleUnMute} className="button is-link">UnMute</button>
            </div>
            <div className="control">
              <button onClick={this.handleLeave} className="button is-link">Leave</button>
            </div>
          </div>
          <hr/>
        </div>
        <div className="column is-three-quarters window-container">
          {this.state.users.map((item, key) => (
            <Window key={item} uid={item} rtcEngine={this.rtcEngine} role={item===SHARE_ID?'remoteVideoSource':'remote'}></Window>
          ))}
          {this.state.local ? (<Window uid={this.state.local} rtcEngine={this.rtcEngine} role="local">
          </Window>) : ''}
          {this.state.localVideoSource ? (<Window uid={this.state.localVideoSource} rtcEngine={this.rtcEngine} role="localVideoSource">
          </Window>) : ''}
        </div>
      </div>
    )
  }

}

class Window extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: false
    }
  }

  componentDidMount() {
    let dom = document.querySelector(`#video-${this.props.uid}`)
    if (this.props.role === 'local') {
      dom && this.props.rtcEngine.setupLocalVideo(dom)
      this.props.rtcEngine.setupViewContentMode("local", 1)
    } else if (this.props.role === 'localVideoSource') {
      dom && this.props.rtcEngine.setupLocalVideoSource(dom)
      this.props.rtcEngine.setupViewContentMode('videosource', 1);
    } else if (this.props.role === 'remote') {
      dom && this.props.rtcEngine.subscribe(this.props.uid, dom)
      this.props.rtcEngine.setupViewContentMode(this.props.uid, 1);
    } else if (this.props.role === 'remoteVideoSource') {
      dom && this.props.rtcEngine.subscribe(this.props.uid, dom)
      this.props.rtcEngine.setupViewContentMode(String(SHARE_ID), 1);
    }
  }

  render() {
    return (
      <div className="window-item">
        <div className="video-item" id={'video-' + this.props.uid}></div>
      </div>
    )
  }
}
