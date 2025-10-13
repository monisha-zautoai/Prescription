/*import { Component, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { NgIf, NgForOf, DecimalPipe } from '@angular/common';

interface MedicineSuggestion {
  name: string;
  composition?: string;
  price?: string;
  confidence?: number;
}

interface ProcessedMedicine {
  selected: MedicineSuggestion;       // currently displayed medicine
  suggestions: MedicineSuggestion[];  // all suggestions including selected
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgIf, NgForOf, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  socket!: Socket;
  processedResult: ProcessedMedicine[] = []; // stores selected + suggestions
  showSuggestionModal: boolean = false;
  currentMedicineIndex: number = -1;
  suggestionOptions: MedicineSuggestion[] = [];

  connected: boolean = false;
  recording: boolean = false;
  paused: boolean = false;
  transcription: string = '';
  sttReady: boolean = false;

  audioContext!: AudioContext;
  sourceNode!: MediaStreamAudioSourceNode;
  scriptProcessor!: ScriptProcessorNode;
  MIC_SAMPLE_RATE: number = 16000;
  audioChunksSent: number = 0;

  constructor() {}

  connectSocket() {
    if (this.connected) return;
    this.socket = io('http://localhost:3000');

    this.socket.on('connect', () => {
      console.log('✅ Socket connected with id:', this.socket.id);
      this.connected = true;
      this.sttReady = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected. Reason:', reason);
      this.connected = false;
      this.sttReady = false;
    });

    this.socket.on('stt-ready', () => {
      console.log('🎯 STT session ready!');
      this.sttReady = true;
    });

    this.socket.on('transcription', (text: string) => {
      this.transcription += text + ' ';
    });

    this.socket.on('stt-error', (error) => {
      console.error('❌ STT Error:', error);
      alert('STT error: ' + JSON.stringify(error));
    });
  }

  async startRecording() {
    if (!this.connected || !this.sttReady) return alert('Socket not ready');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (audioEvent) => {
        if (!this.recording || this.paused || !this.connected || !this.sttReady) return;
        const inputBuffer = audioEvent.inputBuffer.getChannelData(0);
        const downsampled = this.downsampleBuffer(inputBuffer, this.audioContext.sampleRate, this.MIC_SAMPLE_RATE);
        const pcm16Bit = this.floatTo16BitPCM(downsampled);
        const base64Audio = this.arrayBufferToBase64(pcm16Bit);

        this.socket.emit('audio-chunk', {
          audio: base64Audio,
          encoding: 'audio/wav',
          sample_rate: this.MIC_SAMPLE_RATE
        });
        this.audioChunksSent++;
      };

      this.sourceNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      this.recording = true;
      this.paused = false;
      this.audioChunksSent = 0;
      console.log('🎙️ Live recording started...');
    } catch (err) {
      console.error('❌ Recording error:', err);
      alert('Cannot access microphone. Please allow permission.');
    }
  }

  pauseRecording() { if (this.recording && !this.paused) this.paused = true; }
  resumeRecording() { if (this.recording && this.paused) this.paused = false; }

  private stopRecordingInternal() {
    if (!this.recording) return;
    this.recording = false;
    this.paused = false;
    if (this.scriptProcessor) this.scriptProcessor.disconnect();
    if (this.sourceNode) this.sourceNode.disconnect();
    if (this.audioContext) this.audioContext.close();
    console.log('🛑 Recording stopped.');
    this.socket.emit('end-audio');
  }

  // --- EDIT: process transcription and convert to ProcessedMedicine ---
  sendTranscription() {
    if (!this.transcription.trim()) return alert('No transcription to send!');
    this.stopRecordingInternal();

    fetch('http://localhost:3000/processed-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: this.transcription })
    })
      .then(res => res.json())
      .then(data => {
        const filteredData = (data.result || []).filter((s: MedicineSuggestion[]) => s.length > 0); // remove empty
        this.processedResult = filteredData.map((s: MedicineSuggestion[]) => ({
          selected: s[0],
          suggestions: s
        }));
        this.currentMedicineIndex = -1;
        this.showNextSuggestion(); // show first modal
      })
      .catch(err => console.error('❌ Error sending transcription:', err));
  }

  // --- EDIT: modal for selecting first suggestion ---
  showNextSuggestion() {
    this.currentMedicineIndex++;
    if (this.currentMedicineIndex >= this.processedResult.length) {
      this.showSuggestionModal = false;
      return;
    }

    const medRow = this.processedResult[this.currentMedicineIndex];
    this.suggestionOptions = medRow.suggestions;
    this.showSuggestionModal = true;
  }

  selectSuggestion(option: MedicineSuggestion) {
    const medRow = this.processedResult[this.currentMedicineIndex];
    if (!medRow) return;

    medRow.selected = option;
    medRow.suggestions = medRow.suggestions.filter(s => s.name !== option.name);
    this.showSuggestionModal = false;

    // Move to next medicine
    this.showNextSuggestion();
  }

  // --- EDIT: swap function for remaining suggestions button ---
  swapSuggestion(med: ProcessedMedicine, option: MedicineSuggestion) {
    if (option.name === med.selected.name) return;

    const prevSelected = med.selected;
    med.selected = option;

    // Replace the clicked option in suggestions with previous selected
    const index = med.suggestions.findIndex(s => s.name === option.name);
    if (index > -1) med.suggestions[index] = prevSelected;
  }

  clearTranscription() {
    this.transcription = '';
    this.processedResult = [];
    this.showSuggestionModal = false;
    this.currentMedicineIndex = -1;
    this.suggestionOptions = [];
  }

  floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const length = float32Array.length;
    const output = new ArrayBuffer(length * 2);
    const view = new DataView(output);
    for (let i = 0; i < length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return output;
  }

  downsampleBuffer(buffer: Float32Array, sourceRate: number, targetRate: number): Float32Array {
    if (targetRate === sourceRate) return buffer;
    const ratio = sourceRate / targetRate;
    const newLength = Math.floor(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      result[i] = buffer[Math.floor(i * ratio)];
    }
    return result;
  }

  arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  ngOnDestroy(): void {
    if (this.socket) this.socket.disconnect();
    this.stopRecordingInternal();
  }
}
*/
/*import { Component, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { NgIf, NgForOf, DecimalPipe } from '@angular/common';

interface MedicineSuggestion {
  name: string;
  composition?: string;
  price?: string;
  confidence?: number;
}

interface ProcessedMedicine {
  selected: MedicineSuggestion;       // currently displayed medicine
  suggestions: MedicineSuggestion[];  // remaining suggestions excluding selected
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgIf, NgForOf, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  socket!: Socket;
  processedResult: ProcessedMedicine[] = [];
  showSuggestionModal: boolean = false;
  currentMedicineIndex: number = -1;
  suggestionOptions: MedicineSuggestion[] = [];

  connected: boolean = false;
  recording: boolean = false;
  paused: boolean = false;
  transcription: string = '';
  sttReady: boolean = false;

  audioContext!: AudioContext;
  sourceNode!: MediaStreamAudioSourceNode;
  scriptProcessor!: ScriptProcessorNode;
  MIC_SAMPLE_RATE: number = 16000;
  audioChunksSent: number = 0;

  constructor() {}

  connectSocket() {
    if (this.connected) return;
    this.socket = io('http://localhost:3000');

    this.socket.on('connect', () => {
      console.log('✅ Socket connected with id:', this.socket.id);
      this.connected = true;
      this.sttReady = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected. Reason:', reason);
      this.connected = false;
      this.sttReady = false;
    });

    this.socket.on('stt-ready', () => {
      console.log('🎯 STT session ready!');
      this.sttReady = true;
    });

    this.socket.on('transcription', (text: string) => {
      this.transcription += text + ' ';
    });

    this.socket.on('stt-error', (error) => {
      console.error('❌ STT Error:', error);
      alert('STT error: ' + JSON.stringify(error));
    });
  }

  async startRecording() {
    if (!this.connected || !this.sttReady) return alert('Socket not ready');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (audioEvent) => {
        if (!this.recording || this.paused || !this.connected || !this.sttReady) return;
        const inputBuffer = audioEvent.inputBuffer.getChannelData(0);
        const downsampled = this.downsampleBuffer(inputBuffer, this.audioContext.sampleRate, this.MIC_SAMPLE_RATE);
        const pcm16Bit = this.floatTo16BitPCM(downsampled);
        const base64Audio = this.arrayBufferToBase64(pcm16Bit);

        this.socket.emit('audio-chunk', {
          audio: base64Audio,
          encoding: 'audio/wav',
          sample_rate: this.MIC_SAMPLE_RATE
        });
        this.audioChunksSent++;
      };

      this.sourceNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      this.recording = true;
      this.paused = false;
      this.audioChunksSent = 0;
      console.log('🎙️ Live recording started...');
    } catch (err) {
      console.error('❌ Recording error:', err);
      alert('Cannot access microphone. Please allow permission.');
    }
  }

  pauseRecording() { if (this.recording && !this.paused) this.paused = true; }
  resumeRecording() { if (this.recording && this.paused) this.paused = false; }

  private stopRecordingInternal() {
    if (!this.recording) return;
    this.recording = false;
    this.paused = false;
    if (this.scriptProcessor) this.scriptProcessor.disconnect();
    if (this.sourceNode) this.sourceNode.disconnect();
    if (this.audioContext) this.audioContext.close();
    console.log('🛑 Recording stopped.');
    this.socket.emit('end-audio');
  }

  // --- Process transcription and convert to ProcessedMedicine ---
  sendTranscription() {
    if (!this.transcription.trim()) return alert('No transcription to send!');
    this.stopRecordingInternal();

    fetch('http://localhost:3000/processed-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: this.transcription })
    })
      .then(res => res.json())
      .then(data => {
        const filteredData = (data.result || []).filter((s: MedicineSuggestion[]) => s.length > 0); // remove empty
        this.processedResult = filteredData.map((s: MedicineSuggestion[]) => ({
          selected: s[0],       // highest confidence suggestion
          suggestions: s.slice(1) // rest of suggestions
        }));
      })
      .catch(err => console.error('❌ Error sending transcription:', err));
  }

  // --- Modal selection ---
  openSuggestionModal(index: number) {
    this.currentMedicineIndex = index;
    this.suggestionOptions = this.processedResult[index].suggestions;
    this.showSuggestionModal = true;
  }

  selectSuggestion(option: MedicineSuggestion) {
    const medRow = this.processedResult[this.currentMedicineIndex];
    if (!medRow) return;

    const prevSelected = medRow.selected;
    medRow.selected = option;

    // Replace selected in suggestions list
    const index = medRow.suggestions.findIndex(s => s.name === option.name);
    if (index > -1) medRow.suggestions[index] = prevSelected;

    this.showSuggestionModal = false;
  }

  // --- Swap function for remaining suggestions button ---
  swapSuggestion(med: ProcessedMedicine, option: MedicineSuggestion) {
    if (option.name === med.selected.name) return;

    const prevSelected = med.selected;
    med.selected = option;

    // Replace the clicked option in suggestions with previous selected
    const index = med.suggestions.findIndex(s => s.name === option.name);
    if (index > -1) med.suggestions[index] = prevSelected;
  }

  clearTranscription() {
    this.transcription = '';
    this.processedResult = [];
    this.showSuggestionModal = false;
    this.currentMedicineIndex = -1;
    this.suggestionOptions = [];
  }

  floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const length = float32Array.length;
    const output = new ArrayBuffer(length * 2);
    const view = new DataView(output);
    for (let i = 0; i < length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return output;
  }

  downsampleBuffer(buffer: Float32Array, sourceRate: number, targetRate: number): Float32Array {
    if (targetRate === sourceRate) return buffer;
    const ratio = sourceRate / targetRate;
    const newLength = Math.floor(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      result[i] = buffer[Math.floor(i * ratio)];
    }
    return result;
  }

  arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  ngOnDestroy(): void {
    if (this.socket) this.socket.disconnect();
    this.stopRecordingInternal();
  }
}
*/
// ✅ Includes: original field, structured data, default suggestion, modal logic
// ... your imports remain the same
import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';  
import { io, Socket } from 'socket.io-client';
import { NgIf, NgForOf, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';

// --- Interfaces ---
interface AlternativeMedicine {
  name: string;
  composition?: string;
  price?: string;
  confidence?: number;
  reason?: string;
}

interface ClinicalWarning {
  message?: string;
  alternatives?: AlternativeMedicine[];
  alternative_suggestion?: AlternativeMedicine | null;
}

interface PatientInfo {
  age: string;
  gender: string;
  chiefComplaint: string;
  drugAllergies: string;
  previousConsultant: string;
  [key: string]: string; 
}

interface MedicineSuggestion {
  name: string;
  composition?: string;
  price?: string;
  confidence?: number;
  doseMorning?: number;
  doseAfternoon?: number;
  doseNight?: number;
  minAge?: number;
  genderRestriction?: string;
  clinical_warning?: ClinicalWarning | null;
}

interface ProcessedMedicine {
  selected: MedicineSuggestion;
  suggestions: MedicineSuggestion[];
  showOtherSuggestions?: boolean;
  previousSelected?: MedicineSuggestion | null;
  dose: string;
  dose1: string;
  dose2: string;
  dose3: string;
  when: string;
  frequency: string;
  duration: string;
  notes: string;
  filteredSuggestions?: MedicineSuggestion[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgIf, NgForOf, FormsModule, NgClass, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  socket!: Socket;
  audioContext!: AudioContext;
  sourceNode!: MediaStreamAudioSourceNode;
  scriptProcessor!: ScriptProcessorNode;
  MIC_SAMPLE_RATE = 16000;

  transcription: string = '';
  recording = false;
  recordingPaused = false;
  sttReady = false;

  showPatientInfoDialog = false;
  showSTTDialog = false;
  showSuggestionDialog = false;
  showClinicalWarningDialog = false;

  voiceInputEnabled = false;

  currentMedForSuggestion: ProcessedMedicine | null = null;
  currentMedForWarning: ProcessedMedicine | null = null;

  patientInfo: PatientInfo = {
    age: '',
    gender: '',
    chiefComplaint: '',
    drugAllergies: '',
    previousConsultant: ''
  };

  processedResult: ProcessedMedicine[] = [];

  // --- New: track alternative medicine for row ---
  selectedAlternativeForRow: ProcessedMedicine | null = null;

  constructor(private cdr: ChangeDetectorRef) {
    this.initSocket();
  }

  // ---------- Socket & STT ----------
  initSocket() {
    this.socket = io('http://localhost:3000');
    this.socket.on('connect', () => (this.sttReady = true));
    this.socket.on('disconnect', () => (this.sttReady = false));
    this.socket.on('transcription', (text: string) => {
      if (!this.recordingPaused) {
        this.transcription += text + ' ';
        this.cdr.detectChanges();
      }
    });
    this.socket.on('stt-error', (err: any) => console.error('STT error', err));
  }

  async startRecording() {
    if (!this.sttReady) return alert('STT not ready');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (audioEvent) => {
        if (!this.recording || this.recordingPaused) return;
        const inputBuffer = audioEvent.inputBuffer.getChannelData(0);
        const downsampled = this.downsampleBuffer(inputBuffer, this.audioContext.sampleRate, this.MIC_SAMPLE_RATE);
        const pcm16Bit = this.floatTo16BitPCM(downsampled);
        const base64Audio = this.arrayBufferToBase64(pcm16Bit);
        this.socket.emit('audio-chunk', {
          audio: base64Audio,
          encoding: 'audio/wav',
          sample_rate: this.MIC_SAMPLE_RATE
        });
      };

      this.sourceNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
      this.recording = true;
      this.recordingPaused = false;
    } catch (err) {
      console.error('Recording error:', err);
      alert('Cannot access microphone');
    }
  }

  stopRecording() {
    if (!this.recording) return;
    this.recording = false;
    this.recordingPaused = false;
    if (this.scriptProcessor) this.scriptProcessor.disconnect();
    if (this.sourceNode) this.sourceNode.disconnect();
    if (this.audioContext) this.audioContext.close();
    this.socket.emit('end-audio');
  }

  togglePauseResume() {
    this.recordingPaused = !this.recordingPaused;
  }

  // ---------- UI / dialogs ----------
  openPatientInfoDialog() { this.showPatientInfoDialog = true; this.transcription = ''; }
  closePatientInfoDialog() { this.showPatientInfoDialog = false; }
  goToSTTDialog() { this.showPatientInfoDialog = false; this.showSTTDialog = true; this.transcription=''; this.startRecording(); }
  closeSTTDialog() { this.showSTTDialog = false; this.stopRecording(); }

  openSuggestionDialog(med: ProcessedMedicine) {
    this.currentMedForSuggestion = med;
    med.filteredSuggestions = [med.selected, ...(med.suggestions || [])];
    this.showSuggestionDialog = true;
  }
  closeSuggestionDialog() { this.currentMedForSuggestion = null; this.showSuggestionDialog = false; }

  openClinicalWarningDialog(med: ProcessedMedicine) {
    this.currentMedForWarning = med;
    this.showClinicalWarningDialog = true;
  }
  closeClinicalWarningDialog() {
    this.currentMedForWarning = null;
    this.showClinicalWarningDialog = false;
  }

  // ---------- MODIFIED: Use button handler ----------
  fetchAndShowUseDialog(med: ProcessedMedicine) {
    if (med?.selected?.clinical_warning?.alternative_suggestion || med?.selected?.clinical_warning?.alternatives?.length) {
      this.selectedAlternativeForRow = med;
      this.openClinicalWarningDialog(med);
      return;
    }

    (async () => {
      try {
        const resp = await fetch('http://localhost:3000/get-alternatives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicine: med.selected.name,
            chiefComplaint: this.patientInfo.chiefComplaint,
            drugAllergies: this.patientInfo.drugAllergies,
            previousConsultant: this.patientInfo.previousConsultant
          })
        });
        const data = await resp.json();
        if (data?.clinical_warning) {
          const cw: ClinicalWarning = data.clinical_warning;
          if (cw.alternative_suggestion && !cw.alternatives) cw.alternatives = [cw.alternative_suggestion];
          if (!cw.alternative_suggestion && cw.alternatives?.length) cw.alternative_suggestion = cw.alternatives[0];
          med.selected.clinical_warning = cw;
        } else {
          med.selected.clinical_warning = { message: 'No clinical warning data returned', alternatives: [] };
        }
        this.selectedAlternativeForRow = med;
        this.openClinicalWarningDialog(med);
      } catch (err) {
        console.error('Error fetching alternatives:', err);
        med.selected.clinical_warning = { message: 'Failed to fetch alternatives', alternatives: [] };
        this.selectedAlternativeForRow = med;
        this.openClinicalWarningDialog(med);
      }
    })();
  }
swapSuggestion(med: ProcessedMedicine, option: MedicineSuggestion & Partial<ProcessedMedicine>) {
  if (!option || option.name === med.selected.name) return;

  const previous = med.selected;
  med.selected = { ...(option as MedicineSuggestion) };

  med.suggestions = [previous, ...med.suggestions.filter(s => s.name !== option.name)];
  med.previousSelected = previous;
  med.filteredSuggestions = [med.selected, ...med.suggestions];

  // --- Update dosage fields if the option has them, else keep existing ---
  med.dose1 = (option as any).dose1 ?? med.dose1 ?? '0';
  med.dose2 = (option as any).dose2 ?? med.dose2 ?? '0';
  med.dose3 = (option as any).dose3 ?? med.dose3 ?? '0';
  med.dose = `${med.dose1}-${med.dose2}-${med.dose3}`;
}

revertMedicine(med: ProcessedMedicine) {
  if (!med.previousSelected) return;

  const current = med.selected;
  med.selected = med.previousSelected;

  med.suggestions = [current, ...med.suggestions.filter(s => s.name !== med.previousSelected?.name)];
  med.previousSelected = null;
  med.filteredSuggestions = [med.selected, ...med.suggestions];

  // --- Restore dosage from ProcessedMedicine ---
  med.dose1 = med.dose1 ?? '0';
  med.dose2 = med.dose2 ?? '0';
  med.dose3 = med.dose3 ?? '0';
  med.dose = `${med.dose1}-${med.dose2}-${med.dose3}`;
}


  async sendTranscription() {
    if (!this.transcription.trim()) return alert('Please speak before sending');
    this.stopRecording();

    try {
      const response = await fetch('http://localhost:3000/processed-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: this.transcription, patientInfo: this.patientInfo })
      });
      const data = await response.json();

      if (data?.result?.length) {
        this.processedResult = data.result.map((item: any) => {
          const validSuggestions: MedicineSuggestion[] = (item.suggestions || []).filter((s: any) => !!s?.name);
          validSuggestions.forEach((s: any) => {
            if (!s.price) s.price = '-';
            if (s.confidence === undefined) s.confidence = 0;
            if (!s.clinical_warning) s.clinical_warning = null;
            const cw = s.clinical_warning as ClinicalWarning | null;
            if (cw) {
              if (cw.alternative_suggestion && !cw.alternatives) cw.alternatives = [cw.alternative_suggestion];
              if (!cw.alternative_suggestion && cw.alternatives?.length) cw.alternative_suggestion = cw.alternatives[0];
            }
          });

          const highest = validSuggestions[0] || { name: '' } as MedicineSuggestion;
          const suggestionsRest = validSuggestions.slice(1);
          const doseParts = (item.original?.dose || '--').split('-');
          const [d1, d2, d3] = [doseParts[0] || '0', doseParts[1] || '0', doseParts[2] || '0'];

          return {
            selected: highest,
            suggestions: suggestionsRest,
            filteredSuggestions: validSuggestions,
            dose: item.original?.dose || '--',
            dose1: d1,
            dose2: d2,
            dose3: d3,
            when: item.original?.when || '--',
            frequency: item.original?.frequency || '--',
            duration: item.original?.duration || '--',
            notes: item.original?.notes || '--'
          } as ProcessedMedicine;
        });
      } else {
        this.processedResult = [];
      }
      this.showSTTDialog = false;
    } catch (err) {
      console.error('Error sending transcription:', err);
      alert('Error sending transcription — check console');
    }
  }

  startVoiceRecognition(field: string) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Browser does not support voice input');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      if (event.results && event.results[0] && event.results[0][0]) {
        this.patientInfo[field] = event.results[0][0].transcript;
        this.cdr.detectChanges();
      }
    };
    recognition.onerror = (event: any) => {
      console.error('Voice recognition error:', event);
      alert(`Voice recognition failed: ${event.error}`);
    };
    recognition.start();
  }

  floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const output = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(output);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return output;
  }

  downsampleBuffer(buffer: Float32Array, sourceRate: number, targetRate: number) {
    if (targetRate === sourceRate) return buffer;
    const ratio = sourceRate / targetRate;
    const newLength = Math.floor(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) result[i] = buffer[Math.floor(i * ratio)];
    return result;
  }

  arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  isMedicineUnsuitable(med: ProcessedMedicine): boolean {
    const allergies = this.patientInfo['drugAllergies']?.toLowerCase().split(',') || [];
    const medName = (med.selected?.name || '').toLowerCase();
    const allergyConflict = allergies.some(a => a && medName.includes(a.trim()));
    const age = parseInt(this.patientInfo['age'] || '0', 10);
    const ageConflict = med.selected?.minAge !== undefined ? age < (med.selected.minAge || 0) : false;
    const genderConflict = med.selected?.genderRestriction
      ? this.patientInfo['gender'] !== med.selected.genderRestriction
      : false;
    const warningConflict = !!med.selected?.clinical_warning?.message;
    return allergyConflict || ageConflict || genderConflict || warningConflict;
  }
hasSafeAlternative(med: ProcessedMedicine): boolean {
  const warning = med.selected?.clinical_warning;
  return !!(warning && warning.alternatives && warning.alternatives.length > 0);
}

  useSuggestion(med: ProcessedMedicine, option: MedicineSuggestion) {
    this.swapSuggestion(med, option);
  }

  ngOnDestroy() {
    if (this.socket) this.socket.disconnect();
    this.stopRecording();
  }
}
