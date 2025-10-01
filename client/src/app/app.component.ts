import { Component, OnInit } from '@angular/core';
import { io, Socket } from 'socket.io-client';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  socket!: Socket;
  connected: boolean = false;
  recording: boolean = false;
  transcription: string = '';
  audioChunksSent: number = 0;
  mediaRecorder!: MediaRecorder;

  ngOnInit(): void {
    this.socket = io('http://localhost:3002'); // your backend socket port

    this.socket.on('connect', () => {
      console.log('✅ Socket connected with id:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected. Reason:', reason);
      this.connected = false;
    });

    this.socket.on('transcription', (text: string) => {
      this.transcription += text + ' ';
    });

    this.socket.on('stt-error', (error) => {
      console.error('STT Error:', error);
      alert('STT error: ' + JSON.stringify(error));
    });
  }

  async startRecording() {
    if (!this.connected) {
      alert('Socket not connected. Cannot start recording.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunksSent = 0;
      this.recording = true;

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          const base64String = btoa(String.fromCharCode(...uint8Array));

          if (this.connected) {
            this.socket.emit('audio-chunk', { chunk: base64String });
            this.audioChunksSent++;
            console.log('🔊 Sent audio chunk #', this.audioChunksSent);
          } else {
            console.error('⚠️ Socket disconnected. Audio not sent.');
          }
        };
        reader.readAsArrayBuffer(event.data);
      };

      this.mediaRecorder.onstop = () => {
        console.log(`Recording stopped. Total chunks sent: ${this.audioChunksSent}`);
        if (this.audioChunksSent === 0) {
          alert('No audio was sent. Check your microphone or connection.');
        }
        this.socket.emit('end-audio');
        this.recording = false;
      };

      this.mediaRecorder.start(300); // emit every 300ms
    } catch (err) {
      console.error('❌ Error accessing microphone:', err);
      alert('Cannot access microphone. Please allow permission.');
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }
}
