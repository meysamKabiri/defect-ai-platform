import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  DatabaseZap,
  Factory,
  Gauge,
  GitBranch,
  Layers3,
  LockKeyhole,
  Network,
  Radar,
  ShieldCheck,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type HeroMetric = {
  label: string
  value: string
}

type HeroFeature = {
  description: string
  icon: LucideIcon
  title: string
}

const metrics: HeroMetric[] = [
  {
    label: 'Validation',
    value: 'AI',
  },
  {
    label: 'Feedback',
    value: 'QA',
  },
  {
    label: 'Workflow',
    value: 'Team',
  },
]

const features: HeroFeature[] = [
  {
    title: 'Validate on real factory images',
    description: 'Upload production inspection photos and review AI defect predictions against actual QA cases.',
    icon: Radar,
  },
  {
    title: 'Capture simple operator feedback',
    description: 'Track false positives, missed defects, and uncertain predictions without complex annotation overhead.',
    icon: Workflow,
  },
  {
    title: 'Build customer-specific learning loops',
    description: 'Prepare reviewed examples and validation history for future model improvement workflows.',
    icon: LockKeyhole,
  },
]

const stack = [
  'React',
  'TypeScript',
  'Redux Toolkit',
  'RTK Query',
  'FastAPI',
  'MySQL',
  'Redis',
  'Docker',
  'YOLOv8',
  'OpenCV',
  'TailwindCSS',
]

const pipelineSteps = [
  {
    icon: Factory,
    label: 'Factory image',
  },
  {
    icon: DatabaseZap,
    label: 'AI prediction',
  },
  {
    icon: BrainCircuit,
    label: 'QA review',
  },
  {
    icon: Activity,
    label: 'Learning set',
  },
]

function HeroBadge({
  children,
  icon: Icon,
  tone = 'primary',
}: {
  children: string
  icon: LucideIcon
  tone?: 'primary' | 'success'
}) {
  return (
    <div
      className={cn(
        'inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-card backdrop-blur',
        tone === 'primary'
          ? 'border-primary/20 bg-primary/10 text-primary'
          : 'border-success/20 bg-success/10 text-success',
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </div>
  )
}

function MetricCard({ label, value }: HeroMetric) {
  return (
    <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-card backdrop-blur">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  )
}

function FeatureItem({ description, icon: Icon, title }: HeroFeature) {
  return (
    <li className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3">
      <div className="grid size-10 place-items-center rounded-2xl border border-border bg-surface/75 text-primary shadow-card backdrop-blur">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </li>
  )
}

function PipelinePreview() {
  return (
    <div className="rounded-3xl border border-border bg-surface/70 p-4 shadow-card backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Validation workflow</p>
          <p className="mt-1 text-sm font-semibold text-foreground">From factory image to reviewed result</p>
        </div>
        <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <GitBranch className="size-4" aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-3">
        {pipelineSteps.map(({ icon: Icon, label }, index) => (
          <div className="flex items-center gap-3" key={label}>
            <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-background text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="h-px flex-1 bg-border" aria-hidden="true" />
            <span className="min-w-28 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              {index + 1}. {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AuthHero() {
  return (
    <section className="relative hidden min-h-screen overflow-hidden border-r border-border bg-background p-8 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:overflow-y-auto xl:p-12">
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--background)/0.62),hsl(var(--background)/0.86)),url('/images/auth-bg.jpg')] bg-cover bg-center" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,hsl(var(--primary)/0.28),transparent_32%),radial-gradient(circle_at_82%_72%,hsl(var(--success)/0.18),transparent_28%)]" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-surface/80 to-transparent" aria-hidden="true" />

      <div className="relative z-10">
        <div className="flex flex-wrap gap-3">
          <HeroBadge icon={ShieldCheck}>DefectAI Workspace</HeroBadge>
          <HeroBadge icon={Zap} tone="success">
            Inspection validation
          </HeroBadge>
        </div>

        <div className="mt-16 max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface/65 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground shadow-card backdrop-blur">
            <Cpu className="size-4 text-primary" aria-hidden="true" />
            AI-first industrial inspection validation
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-foreground xl:text-6xl">
            AI Inspection Validation for Manufacturing Teams
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            DefectAI helps factories test AI defect detection on real production images, collect simple human feedback, and build trusted inspection workflows before scaling to production.
          </p>
        </div>

        <ul className="mt-10 grid max-w-3xl gap-5" aria-label="Platform capabilities">
          {features.map((feature) => (
            <FeatureItem key={feature.title} {...feature} />
          ))}
        </ul>
      </div>

      <div className="relative z-10 mt-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-surface/70 p-5 shadow-card backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Layers3 className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Workspace capabilities</h2>
                <p className="mt-1 text-sm text-muted-foreground">Projects, AI predictions, operator feedback, and review traceability.</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2" aria-label="Technologies used">
              {stack.map((item) => (
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground" key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <PipelinePreview />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-card backdrop-blur">
              <Gauge className="size-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-foreground">Production readiness</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Validate AI inspection before scaling on the line.</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface/70 p-4 shadow-card backdrop-blur">
              <Network className="size-5 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-foreground">Team workspace</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Invite QA and engineering members when ready.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-8 right-8 hidden items-center gap-2 rounded-full border border-border bg-surface/70 px-4 py-2 text-xs font-semibold text-muted-foreground shadow-card backdrop-blur xl:flex" aria-hidden="true">
        <CheckCircle2 className="size-4 text-success" />
        Invitation-only workspace access
      </div>
    </section>
  )
}
