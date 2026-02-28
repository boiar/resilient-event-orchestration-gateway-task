export class QueueStub {
    public jobs: { name: string; data: any; opts?: any }[] = [];
    private _shouldFail = false;

    async add(name: string, data: any, opts?: any) {
        if (this._shouldFail) throw new Error('queue error');
        this.jobs.push({ name, data, opts });
        return { id: 'job_123' };
    }

    simulateFailure() {
        this._shouldFail = true;
    }

    getLastJob() {
        return this.jobs[this.jobs.length - 1] ?? null;
    }

    clear() {
        this.jobs = [];
        this._shouldFail = false;
    }
}