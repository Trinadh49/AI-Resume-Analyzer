import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ResumeUpload  } from './resume-upload/resume-upload';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ResumeUpload],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('AI Resume Analyzer');
}
