import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Heading,
  Icon,
  Input,
  Skeleton,
  Text,
  ThemeToggle,
} from '@letscycle/ui';
import { ApiStatus } from '@/components/api-status';

// Internal design-system reference (not linked in the app nav).
export default function DesignSystemPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Icon name="Recycle" className="size-8" />
          <span className="text-2xl font-bold tracking-tight">LetsCycle</span>
        </div>
        <ThemeToggle />
      </header>

      <ApiStatus />

      <Heading level={1} className="mt-4">
        Design system
      </Heading>
      <Text muted className="mt-2">
        Fresh-green tokens, Sora type, and the core primitives — all re-theme from
        one file. Toggle light/dark above.
      </Text>

      <section className="mt-8 space-y-4">
        <Heading level={3}>Buttons</Heading>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
          <Button size="icon" aria-label="Add">
            <Icon name="Plus" />
          </Button>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <Heading level={3}>Badges</Heading>
        <div className="flex flex-wrap gap-2">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Free</Badge>
          <Badge variant="warning">Pending</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <Heading level={3}>Input</Heading>
        <Input placeholder="Search nearby items…" />
      </section>

      <section className="mt-8 space-y-4">
        <Heading level={3}>Card</Heading>
        <Card>
          <CardHeader>
            <CardTitle>Nearly-new road bike</CardTitle>
            <CardDescription>2.3 km away · Free to a good home</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-success">
            <Icon name="BadgeCheck" className="size-5" />
            <Text className="text-sm">Verified seller</Text>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 space-y-4">
        <Heading level={3}>Skeleton</Heading>
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </section>
    </main>
  );
}
