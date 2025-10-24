
// app.component.ts
import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NgIf, NgForOf, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import RecordRTC from 'recordrtc';

// --- Interfaces ---
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
  dose?: string;
  doseMorning?: number;
  doseAfternoon?: number;
  doseNight?: number;
  minAge?: number;
  genderRestriction?: string;
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
  doseDisplay?: string;
  showWhenDropdown?: boolean;
  showFrequencyDropdown?: boolean;
  showDurationDropdown?: boolean;

}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgIf, NgForOf, FormsModule, NgClass, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  transcription: string = '';
  recording = false;
  sending = false;
  showSTTDialog = false;
  showSuggestionDialog = false;
  loading: boolean = false;
  selectedAudioFile: File | null = null;
  searchDone = false;
sendEnabled: boolean = false;
recordingState: 'idle' | 'recording' | 'paused' | 'stopped' = 'idle';

  showDeleteDialog = false;
  medicineToDelete: any = null;
deleteIndex: number | null = null; 
  // Dropdown states
  // For default row dropdowns (when processedResult is empty)
  whenDropdownOpen: boolean = false;
  frequencyDropdownOpen: boolean = false;
  durationDropdownOpen: boolean = false;

  // Form values for input row
  whenValue: string = '';
  frequencyValue: string = '';
  durationValue: string = '';
  nameValue: string = '';
  notesValue: string = '';
  dose1Value: string = '0';
  dose2Value: string = '0';
  dose3Value: string = '0';

  recorder: any;
  audioBlob!: Blob;
  audioURL: string = '';

  defaultDose1 = 0;
  defaultDose2 = 0;
  defaultDose3 = 0;

  currentMedForSuggestion: ProcessedMedicine | null = null;

  patientInfo: PatientInfo = {
    age: '',
    gender: '',
    chiefComplaint: '',
    drugAllergies: '',
    previousConsultant: ''
  };

  processedResult: ProcessedMedicine[] = [];

  searchText: string = '';
  originalSuggestions: MedicineSuggestion[] = [];

  constructor(private cdr: ChangeDetectorRef) { }

  // ---------- Dropdown Management ----------
  // Add these properties to your class
  showDefaultWhenDropdown: boolean = false;
  showDefaultFrequencyDropdown: boolean = false;
  showDefaultDurationDropdown: boolean = false;

  // Update selectOption method to handle null med (for default row)
  selectOption(med: ProcessedMedicine | null, field: string, value: string) {
    if (med) {
      // Existing medicine row
      switch (field) {
        case 'when':
          med.when = value;
          med.showWhenDropdown = false;
          break;
        case 'frequency':
          med.frequency = value;
          med.showFrequencyDropdown = false;
          break;
        case 'duration':
          med.duration = value;
          med.showDurationDropdown = false;
          break;
      }
    } else {
      // Default/empty row
      switch (field) {
        case 'when':
          this.whenValue = value;
          this.showDefaultWhenDropdown = false;
          break;
        case 'frequency':
          this.frequencyValue = value;
          this.showDefaultFrequencyDropdown = false;
          break;
        case 'duration':
          this.durationValue = value;
          this.showDefaultDurationDropdown = false;
          break;
      }
    }
    this.cdr.detectChanges();
  }

  // Update hideDropdown method
  hideDropdown(med: ProcessedMedicine | null, field: string) {
    setTimeout(() => {
      if (med) {
        switch (field) {
          case 'when':
            med.showWhenDropdown = false;
            break;
          case 'frequency':
            med.showFrequencyDropdown = false;
            break;
          case 'duration':
            med.showDurationDropdown = false;
            break;
        }
      } else {
        // Default/empty row
        switch (field) {
          case 'when':
            this.showDefaultWhenDropdown = false;
            break;
          case 'frequency':
            this.showDefaultFrequencyDropdown = false;
            break;
          case 'duration':
            this.showDefaultDurationDropdown = false;
            break;
        }
      }
      this.cdr.detectChanges();
    }, 200);
  }
  audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels,
        length = buffer.length * numOfChan * 2 + 44,
        bufferArray = new ArrayBuffer(length),
        view = new DataView(bufferArray),
        channels = [],
        sampleRate = buffer.sampleRate;

  let offset = 0;

  function writeString(s: string) {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset++, s.charCodeAt(i));
    }
  }

  // RIFF chunk descriptor
  writeString('RIFF');
  view.setUint32(offset, length - 8, true); offset += 4;
  writeString('WAVE');

  // fmt sub-chunk
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * numOfChan * 2, true); offset += 4;
  view.setUint16(offset, numOfChan * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;

  // data sub-chunk
  writeString('data');
  view.setUint32(offset, length - offset - 4, true); offset += 4;

  for (let i = 0; i < numOfChan; i++)
    channels.push(buffer.getChannelData(i));

  let sample = 0;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numOfChan; ch++) {
      let val = Math.max(-1, Math.min(1, channels[ch][i]));
      val = val < 0 ? val * 0x8000 : val * 0x7FFF;
      view.setInt16(offset, val, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}



  getAdditionalMedicines() {
    if (!this.processedResult || this.processedResult.length <= 1) {
      return [];
    }
    return this.processedResult.slice(1);
  }

  // ---------- Recording (WAV) ----------
  async startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.recorder = new RecordRTC(stream, {
      type: 'audio',
      mimeType: 'audio/wav',
      recorderType: RecordRTC.StereoAudioRecorder,
      numberOfAudioChannels: 1,
      desiredSampRate: 44100,
    });

    this.recorder.startRecording();
    this.recordingState = 'recording';
    this.recording = true;
    console.log('🎙️ Recording started (WAV)');
  } catch (err) {
    console.error('Error starting recording:', err);
    alert('Cannot access microphone');
  }
}

openDeleteDialog(med: ProcessedMedicine) {
  this.medicineToDelete = med;
  this.showDeleteDialog = true;
}

confirmDeleteMedicine() {
  if (this.medicineToDelete) {
    const index = this.processedResult.indexOf(this.medicineToDelete);
    if (index > -1) {
      this.processedResult.splice(index, 1);
      console.log('🗑️ Deleted medicine:', this.medicineToDelete.selected.name);
    }
  }
  this.closeDeleteDialog();
}

  closeDeleteDialog() {
    this.showDeleteDialog = false;
    this.medicineToDelete = null;
  }

  

  stopRecording() {
  if (!this.recorder) return;

  this.recorder.stopRecording(() => {
    this.audioBlob = this.recorder.getBlob();
    this.audioURL = URL.createObjectURL(this.audioBlob);
    console.log('🛑 Recording stopped, WAV Blob ready:', this.audioBlob);
  });

  this.recording = false;
  this.recordingState = 'idle';
  this.sendEnabled = true;
}

toggleRecording() {
  if (!this.recorder) return;

  if (this.recordingState === 'recording') {
    this.recorder.pauseRecording();
    this.recordingState = 'paused';
    console.log('⏸️ Recording paused');
  } else if (this.recordingState === 'paused') {
    this.recorder.resumeRecording();
    this.recordingState = 'recording';
    console.log('▶️ Recording resumed');
  }
}



  // ---------- Dialogs ----------
  openSTTDialog() {
    this.transcription = '';
    this.audioBlob = null!;
    this.audioURL = '';
    this.showSTTDialog = true;

    setTimeout(() => this.startRecording(), 200);
  }

  closeSTTDialog() {
    this.showSTTDialog = false;
    if (this.recording) {
      this.stopRecording();
    }
  }

  openSuggestionDialog(med: ProcessedMedicine) {
    this.currentMedForSuggestion = med;
    // Initialize filteredSuggestions with all available suggestions
    med.filteredSuggestions = [med.selected, ...(med.suggestions || [])];
    this.originalSuggestions = [...med.filteredSuggestions];
    this.searchText = '';
    this.showSuggestionDialog = true;
    this.cdr.detectChanges();
  }

  closeSuggestionDialog() {
    this.currentMedForSuggestion = null;
    this.showSuggestionDialog = false;
    this.searchText = '';
  }

  // ---------- Search & Reset ----------
  async searchMedicineSuggestions() {
  if (!this.searchText.trim() || !this.currentMedForSuggestion) return;

  this.loading = true;
  try {
    const response = await fetch(
      `http://localhost:3000/voice/medicine/suggestions?name=${encodeURIComponent(this.searchText)}`
    );
    if (!response.ok) throw new Error(response.statusText);

    const data = await response.json();
    const suggestions = Array.isArray(data) ? data : (data.suggestions || []);

    this.currentMedForSuggestion.filteredSuggestions = suggestions;

    this.searchDone = true; // ✅ mark that a search has been done
    this.loading = false;
    this.cdr.detectChanges();

    console.log('🔍 Search completed:', suggestions.length, 'results found');
  } catch (err) {
    console.error('Error fetching search suggestions:', err);
    this.loading = false;
    alert('Failed to search medicines. Please try again.');
  }
}
resetSuggestions() {
  if (!this.currentMedForSuggestion) return;

  this.currentMedForSuggestion.filteredSuggestions = [...this.originalSuggestions];
  this.searchText = '';
  this.searchDone = false; // ✅ reset disables the button
  this.cdr.detectChanges();

  console.log('↻ Reset to original suggestions');
}


  // ---------- Send audio (WAV) to backend ----------
  async sendTranscription() {
    if (this.recording) {
      this.stopRecording();
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (!this.audioBlob) {
      alert('Please record audio before sending');
      return;
    }

    this.sending = true;

    try {
      const formData = new FormData();
      formData.append('audioFile', this.audioBlob, 'audio.wav');
      console.log('📤 Sending audio to backend...');

      const response = await fetch('http://localhost:3000/voice/upload', {
        
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.transcription = data.text || '';
      const result = data.result || [];

      this.processedResult = result.map((item: any) => {
        const validSuggestions = (item.suggestions || []).filter((s: any) => !!s?.name);
        const highest = validSuggestions[0] || { name: '' } as MedicineSuggestion;
        const suggestionsRest = validSuggestions.slice(1);

        const doseParts = (item.original?.dose || '0-0-0').split('-');
        const [d1, d2, d3] = [
          doseParts[0] || '0',
          doseParts[1] || '0',
          doseParts[2] || '0'
        ];
        const doseDisplay = item.original?.dose ? `${item.original.dose}` : '0-0-0';

        return {
          selected: highest,
          suggestions: suggestionsRest,
          filteredSuggestions: [highest, ...suggestionsRest],
          dose: item.original?.dose || '0-0-0',
          dose1: d1,
          dose2: d2,
          dose3: d3,
          when: item.original?.when || '',
          frequency: item.original?.frequency || '',
          duration: item.original?.duration || '',
          notes: item.original?.notes || '',
          doseDisplay
        } as ProcessedMedicine;
      });

      this.showSTTDialog = false;
      this.sending = false;
      this.cdr.detectChanges();
      console.log('✅ Transcription processed successfully');

    } catch (err) {
      console.error('Error sending audio to backend:', err);
      alert('Failed to send audio. Please check your connection and try again.');
      this.sending = false;
    }
  }

  // ---------- Swap & Revert ----------
  swapSuggestion(med: ProcessedMedicine, option: MedicineSuggestion) {
    if (!option || option.name === med.selected.name) return;

    const previous = med.selected;
    med.selected = { ...option };

    // Store the previous selection for revert
    med.previousSelected = previous;

    // Update filteredSuggestions to reflect the swap
    if (med.filteredSuggestions) {
      med.filteredSuggestions = med.filteredSuggestions.map(
        s => s.name === option.name ? previous : s
      );
    }

    this.cdr.detectChanges();
    console.log('🔄 Swapped medicine:', previous.name, '→', option.name);
  }

  revertMedicine(med: ProcessedMedicine) {
    if (!med.previousSelected) return;

    const revertTo = med.previousSelected;
    med.selected = revertTo;
    med.previousSelected = null;

    // Restore original suggestions
    med.filteredSuggestions = [...this.originalSuggestions];
    this.cdr.detectChanges();
    console.log('↩️ Reverted to:', revertTo.name);
  }

  // ---------- Remove Row ----------
  removeRow(index: number) {
    if (this.processedResult && this.processedResult.length > index) {
      if (confirm('Are you sure you want to remove this medicine?')) {
        this.processedResult.splice(index, 1);
        this.cdr.detectChanges();
        console.log('🗑️ Removed medicine at index:', index);
      }
    }
  }

  // ---------- Save Prescriptions ----------
  async savePrescriptions() {
    if (!this.processedResult || this.processedResult.length === 0) {
      alert('No medicines to save. Please add at least one medicine.');
      return;
    }

    try {
      this.sending = true;

      const prescriptionData = {
        patientInfo: this.patientInfo,
        medicines: this.processedResult.map(med => ({
          name: med.selected.name,
          composition: med.selected.composition,
          dose: med.dose,
          dose1: med.dose1,
          dose2: med.dose2,
          dose3: med.dose3,
          when: med.when,
          frequency: med.frequency,
          duration: med.duration,
          notes: med.notes,
          price: med.selected.price
        })),
        timestamp: new Date().toISOString()
      };

      console.log('💾 Saving prescription:', prescriptionData);

      // TODO: Replace with your actual save endpoint
      const response = await fetch('http://localhost:3000/prescriptions/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prescriptionData)
      });

      if (!response.ok) {
        throw new Error(`Save failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Prescription saved successfully:', result);

      alert('Prescription saved successfully! ✅');
      this.sending = false;

    } catch (err) {
      console.error('Error saving prescription:', err);
      alert('Failed to save prescription. Please try again.');
      this.sending = false;
    }
  }
  // ---------- Upload & Transcribe WAV file ----------
  triggerFileUpload() {
    const fileInput = document.getElementById('audioUpload') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onAudioFileSelected(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  this.selectedAudioFile = file;
  this.uploadAndTranscribeAudio();
}

async uploadAndTranscribeAudio() {
  if (!this.selectedAudioFile) return;

  this.sending = true;

  try {
    let wavBlob: Blob;

    // If already a WAV file, use it directly
    if (this.selectedAudioFile.type === 'audio/wav') {
      wavBlob = this.selectedAudioFile;
    } else {
      // Convert any audio file to WAV using Web Audio API
      const arrayBuffer = await this.selectedAudioFile.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      wavBlob = this.audioBufferToWav(audioBuffer); // reuse your WAV conversion function
    }

    const formData = new FormData();
    formData.append('audioFile', wavBlob, 'converted.wav');

    console.log('📤 Uploading audio as WAV...');
    const response = await fetch('http://localhost:3000/voice/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data?.text) {
      this.transcription = data.text;
      console.log('📝 Uploaded audio transcribed:', this.transcription);

      // ✅ reuse your same logic that handles transcription
      const result = data.result || [];
      this.processedResult = result.map((item: any) => {
        const validSuggestions = (item.suggestions || []).filter((s: any) => !!s?.name);
        const highest = validSuggestions[0] || { name: '' } as MedicineSuggestion;
        const suggestionsRest = validSuggestions.slice(1);

        const doseParts = (item.original?.dose || '0-0-0').split('-');
        const [d1, d2, d3] = [
          doseParts[0] || '0',
          doseParts[1] || '0',
          doseParts[2] || '0'
        ];
        const doseDisplay = item.original?.dose ? `${item.original.dose}` : '0-0-0';

        return {
          selected: highest,
          suggestions: suggestionsRest,
          filteredSuggestions: [highest, ...suggestionsRest],
          dose: item.original?.dose || '0-0-0',
          dose1: d1,
          dose2: d2,
          dose3: d3,
          when: item.original?.when || '',
          frequency: item.original?.frequency || '',
          duration: item.original?.duration || '',
          notes: item.original?.notes || '',
          doseDisplay
        } as ProcessedMedicine;
      });

      this.cdr.detectChanges();
      console.log('✅ Uploaded audio processed successfully');
    } else {
      alert('Transcription failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('Error uploading audio file');
  } finally {
    this.sending = false;
  }
}


  // ---------- Legacy Methods (for compatibility) ----------
  deleteMedicine(index: number) {
    console.log('deleted');
    this.removeRow(index);
  }

  addNewMedicine() {
    if (!this.nameValue.trim()) {
      alert('Please enter a medicine name');
      return;
    }

    const newMedicine: ProcessedMedicine = {
      selected: {
        name: this.nameValue
      },
      suggestions: [],
      filteredSuggestions: [],
      dose: `${this.dose1Value}-${this.dose2Value}-${this.dose3Value}`,
      dose1: this.dose1Value,
      dose2: this.dose2Value,
      dose3: this.dose3Value,
      when: this.whenValue,
      frequency: this.frequencyValue,
      duration: this.durationValue,
      notes: this.notesValue,
      doseDisplay: `${this.dose1Value}-${this.dose2Value}-${this.dose3Value}`,
      previousSelected: null
    };

    this.processedResult.push(newMedicine);

    // Reset form
    this.nameValue = '';
    this.dose1Value = '0';
    this.dose2Value = '0';
    this.dose3Value = '0';
    this.whenValue = '';
    this.frequencyValue = '';
    this.durationValue = '';
    this.notesValue = '';

    this.cdr.detectChanges();
    console.log('➕ Added new medicine:', newMedicine.selected.name);
  }

  ngOnDestroy() {
    if (this.recorder && this.recording) {
      this.stopRecording();
    }
    // Clean up audio URL
    if (this.audioURL) {
      URL.revokeObjectURL(this.audioURL);
    }
  }
}
