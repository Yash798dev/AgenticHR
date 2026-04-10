import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WorkflowService, UploadedFile } from '../../core/services/workflow.service';

@Component({
  selector: 'app-files',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="page">
      <aside class="sidebar">
        <div class="brand">AGENTIC HR</div>
        <nav class="nav">
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/workflows" routerLinkActive="active">Workflows</a>
          <a routerLink="/jobs" routerLinkActive="active">Jobs</a>
          <a routerLink="/files" routerLinkActive="active">Files</a>
          <a routerLink="/billing" routerLinkActive="active">Billing</a>
        </nav>
      </aside>

      <main class="content">
        <header class="toolbar">
          <div>
            <h1>Data Files</h1>
            <p>Uploaded and generated files available in the data directory</p>
          </div>
          <button class="ghost" (click)="reload()" [disabled]="isRefreshing">
            <span class="btn-content">
              <span *ngIf="isRefreshing" class="btn-spinner light"></span>
              {{ isRefreshing ? 'Refreshing...' : 'Refresh' }}
            </span>
          </button>
        </header>

        <section class="card" *ngIf="files.length; else emptyState">
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Size</th>
                <th>Modified</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let file of files">
                <td>{{ file.name }}</td>
                <td>{{ formatSize(file.size) }}</td>
                <td>{{ file.modified | date:'medium' }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <ng-template #emptyState>
          <section class="empty">No files found.</section>
        </ng-template>
      </main>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #0a0a0a; color: #fff; display: grid; grid-template-columns: 220px 1fr; }
    .sidebar { border-right: 1px solid #242424; padding: 20px 14px; background: #0d0d0d; }
    .brand { font-size: 14px; letter-spacing: 0.12em; font-weight: 600; margin-bottom: 20px; }
    .nav { display: grid; gap: 6px; }
    .nav a { color: #bcbcbc; text-decoration: none; padding: 10px 12px; border-radius: 6px; border: 1px solid transparent; }
    .nav a.active, .nav a:hover { color: #fff; background: #151515; border-color: #2f2f2f; }

    .content { padding: 24px; }
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .toolbar h1 { margin: 0; }
    .toolbar p { margin: 4px 0 0; color: #9b9b9b; }

    .card { background: #111; border: 1px solid #252525; border-radius: 10px; overflow: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; border-bottom: 1px solid #1f1f1f; text-align: left; }
    tbody tr { transition: background-color .2s ease; }
    tbody tr:hover { background: #151515; }
    th { color: #a7a7a7; font-weight: 500; }

    .empty { background: #111; border: 1px solid #252525; border-radius: 10px; padding: 30px; color: #a0a0a0; text-align: center; }

    .ghost { background: transparent; color: #d2d2d2; border: 1px solid #3b3b3b; border-radius: 8px; padding: 9px 12px; cursor: pointer; }
    .ghost:hover:not(:disabled) { box-shadow: 0 8px 24px rgba(255,255,255,.08); }

    @media (max-width: 1000px) {
      .page { grid-template-columns: 1fr; }
      .sidebar { position: sticky; top: 0; z-index: 2; border-right: 0; border-bottom: 1px solid #242424; }
      .nav { grid-template-columns: repeat(5, minmax(0,1fr)); }
      .nav a { text-align: center; font-size: 12px; }
    }
  `]
})
export class FilesComponent implements OnInit {
  private service = inject(WorkflowService);

  files: UploadedFile[] = [];
  isRefreshing = false;

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.isRefreshing = true;
    this.service.listUploadedFiles().subscribe({
      next: res => this.files = res.files,
      error: () => {
        this.files = [];
        this.isRefreshing = false;
      },
      complete: () => this.isRefreshing = false
    });
  }

  formatSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
}

