import styles from './SettingsPage.module.css';

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function Row({ label, description, control }: { label: string; description?: string; control: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowBody}>
        <div className={styles.rowLabel}>{label}</div>
        {description && <div className={styles.rowDesc}>{description}</div>}
      </div>
      <div className={styles.rowControl}>{control}</div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  return (
    <label className={styles.toggle}>
      <input type="checkbox" defaultChecked={defaultChecked} className={styles.toggleInput} />
      <span className={styles.toggleTrack} />
    </label>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  return (
    <div className={styles.page}>
      <Section title="General">
        <Row
          label="Automation run limit"
          description="Maximum number of automation runs per day across all workflows."
          control={
            <input
              type="number"
              className={styles.numberInput}
              defaultValue={500}
              min={1}
              aria-label="Daily run limit"
            />
          }
        />
        <Row
          label="Default timezone"
          description="Used for scheduled triggers when no timezone is specified."
          control={
            <select className={styles.select} aria-label="Default timezone">
              <option>America/New_York</option>
              <option>America/Chicago</option>
              <option>America/Los_Angeles</option>
              <option>UTC</option>
            </select>
          }
        />
      </Section>

      <Section title="Notifications">
        <Row
          label="Failure alerts"
          description="Receive an in-app notification when an automation fails."
          control={<Toggle defaultChecked />}
        />
        <Row
          label="Email on failure"
          description="Also send an email to the workspace admin when a failure occurs."
          control={<Toggle />}
        />
        <Row
          label="Run summary digest"
          description="Weekly email with a summary of automation activity."
          control={<Toggle defaultChecked />}
        />
      </Section>

      <Section title="AI Features">
        <Row
          label="AI step suggestions"
          description="Allow AI to suggest next steps as you build automations."
          control={<Toggle defaultChecked />}
        />
        <Row
          label="Auto-name automations"
          description="Use AI to generate a name from the first trigger and action."
          control={<Toggle defaultChecked />}
        />
        <Row
          label="AI model"
          description="Which model to use for AI steps and suggestions."
          control={
            <select className={styles.select} aria-label="AI model">
              <option>claude-sonnet-4-6</option>
              <option>claude-haiku-4-5</option>
            </select>
          }
        />
      </Section>
    </div>
  );
}
