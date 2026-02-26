import { of } from 'rxjs';

export class QueueStub {
    public jobs: { name: string; data: any; opts?: any }[] = [];

    async connect(): Promise<void> {
        return Promise.resolve();
    }

    emit(name: string, data: any) {
        this.jobs.push({ name, data });
        return of(null);
    }

    getLastJob(): { name: string; data: any } | null {
        return this.jobs[this.jobs.length - 1] ?? null;
    }

    clear() {
        this.jobs = [];
    }
}
