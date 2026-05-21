import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-resume-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './resume-upload.html',
  styleUrls: ['./resume-upload.css']
})
export class ResumeUpload {
  selectedFile: File | null = null;
  jobDescription = '';
  result: any = null;
  loading = false;
  errorMessage = '';
  statusMessage = '';
  autoAnalyzeOnSelect = true;
  localFallbackDelayMs = 3000;
  backendTimeoutMs = 10000;
  private localFallbackTriggered = false;
  private backendCompleted = false;
  private backendDelayHandle: ReturnType<typeof setTimeout> | null = null;

  readonly allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  readonly maxFileSizeBytes = 8 * 1024 * 1024;

  constructor(private http: HttpClient) {}

  onFileSelected(event: any) {
    this.errorMessage = '';
    const file: File | undefined = event.target.files?.[0];
    if (!file) {
      this.selectedFile = null;
      return;
    }

    if (!this.allowedTypes.includes(file.type)) {
      this.errorMessage = 'Please upload a PDF, DOC, or DOCX file.';
      this.selectedFile = null;
      event.target.value = '';
      return;
    }

    if (file.size > this.maxFileSizeBytes) {
      this.errorMessage = 'File is too large. Maximum size is 8 MB.';
      this.selectedFile = null;
      event.target.value = '';
      return;
    }

    this.selectedFile = file;
    this.statusMessage = 'Resume loaded. Analysis will start automatically.';

    if (this.autoAnalyzeOnSelect) {
      this.uploadResume();
    }
  }

  uploadResume() {

    if (!this.selectedFile) {
      this.errorMessage = 'Please select a resume file.';
      return;
    }

    this.loading = true;
    this.backendCompleted = false;
    this.localFallbackTriggered = false;
    this.errorMessage = '';
    this.result = null;
    this.statusMessage = `Analyzing resume... backend timeout in ${this.backendTimeoutMs / 1000}s.`;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    if (this.jobDescription) {
      formData.append('jobDescription', this.jobDescription);
    }

    this.clearBackendDelayTimer();
    this.backendDelayHandle = window.setTimeout(() => {
      if (this.loading && !this.backendCompleted && !this.localFallbackTriggered) {
        this.statusMessage = 'Backend is slow; performing a quick local offline analysis now.';
        this.localAnalyze(this.selectedFile as File);
      }
    }, this.localFallbackDelayMs);

    console.log('Starting resume analysis request', {
      url: 'https://localhost:7048/api/Resume/analyze',
      fileName: this.selectedFile.name,
      fileType: this.selectedFile.type,
      jobDescriptionLength: this.jobDescription.length,
    });

    this.http
      .post('https://localhost:7048/api/Resume/analyze', formData)
      .pipe(timeout(this.backendTimeoutMs))
      .subscribe({
        next: (response: any) => {
          this.backendCompleted = true;
          this.clearBackendDelayTimer();
          this.result = response?.result ?? response;
          this.loading = false;
          this.statusMessage = this.localFallbackTriggered
            ? 'Backend result received; updating analysis.'
            : 'Analysis complete.';
        },
        error: (error) => {
          this.clearBackendDelayTimer();

          const isTimeoutError =
            error?.name === 'TimeoutError' ||
            String(error?.message || '').toLowerCase().includes('timeout');
          const isNetworkError =
            error?.status === 0 ||
            (error?.message && String(error.message).toLowerCase().includes('connection refused'));

          if (this.localFallbackTriggered) {
            return;
          }
          if (isTimeoutError || isNetworkError) {
            this.localAnalyze(this.selectedFile as File);
            return;
          }

          console.error('API ERROR:', {
  status: error.status,
  message: error.message,
  error: error.error
});
          this.errorMessage =
            error?.error || error?.message || `Server Error ${error?.status || 'unknown'}`;
          this.loading = false;
        },
      });
  }

  private clearBackendDelayTimer() {
    if (this.backendDelayHandle !== null) {
      clearTimeout(this.backendDelayHandle);
      this.backendDelayHandle = null;
    }
  }

  // Lightweight client-side analysis fallback when backend is unreachable.
  private async localAnalyze(file: File) {
    if (this.localFallbackTriggered) {
      return;
    }
    this.localFallbackTriggered = true;
    this.clearBackendDelayTimer();
    this.loading = true;
    this.statusMessage = 'Performing quick local analysis (offline fallback)...';
    this.result = null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Try to decode as UTF-8 text as a best-effort extraction.
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(arrayBuffer);

      const lowered = text.toLowerCase();

      // Simple skills list to detect common keywords.
      const skills = ['javascript','typescript','angular','react','node','python','java','c#','sql','aws','docker','kubernetes','html','css'];
      const foundSkills = skills.filter(s => lowered.includes(s));

      // Heuristic: look for 0-100 style numeric scores or percentages
      const percentMatch = (() => {
        const m = lowered.match(/(\d{1,3})%/);
        if (m) return Math.min(100, Number(m[1]));
        const scoreMatch = lowered.match(/score[:\s]+(\d{1,3})\b/);
        if (scoreMatch) return Math.min(100, Number(scoreMatch[1]));
        return null;
      })();

      const strengths = foundSkills.slice(0,5).map(s => `Experience with ${s}`);
      const missing = skills.filter(s => !foundSkills.includes(s)).slice(0,5).map(s => s);

      const summary = (text.replace(/\s+/g,' ').trim().slice(0,800)) || 'Unable to extract readable text from the resume. This fallback is approximate.';

      const score = percentMatch ?? Math.round(50 + Math.min(40, foundSkills.length * 5));

      this.result = {
        score,
        matchPercentage: percentMatch ?? null,
        summary,
        strengths,
        weaknesses: missing.map(m => `Little or no mention of ${m}`),
        missingSkills: missing,
        suggestions: missing.slice(0,5).map(s => `Consider adding ${s} experience or keywords`),
        jobSummary: this.jobDescription ? `Compared against job description length ${this.jobDescription.length} chars.` : null
      };

      this.statusMessage = 'Local analysis complete (approximate).';
    } catch (err) {
      console.error('Local analysis failed:', err);
      this.errorMessage = 'Local analysis failed. Please ensure the file is a readable PDF/DOC/DOCX or run the backend service.';
      this.statusMessage = '';
    } finally {
      this.loading = false;
    }
  }

  downloadPdfReport() {
    const reportElement = document.getElementById('analysis-report');
    if (!reportElement) {
      alert('Report section is not available.');
      return;
    }

    import('html2canvas').then(({ default: html2canvas }) => {
      import('jspdf').then(({ jsPDF }) => {
        html2canvas(reportElement, { scale: 2 }).then((canvas: HTMLCanvasElement) => {
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = (canvas.height * pageWidth) / canvas.width;
          pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
          pdf.save('resume-analysis-report.pdf');
        });
      });
    });
  }
}

