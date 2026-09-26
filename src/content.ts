// Everything the page says lives here, so updating a release or a command is a one-file change.

export const REPO = 'https://github.com/adelfardi/iceguard';
export const RELEASE_TAG = '0.2.0'; // last release with published images + demo assets

export const DEMO_VIDEO = `${REPO}/releases/download/v${RELEASE_TAG}/demo.mp4`;

export const LINKS = {
  repo: REPO,
  demo: 'https://demo.iceguard.cloud',
  releases: `${REPO}/releases`,
  issues: `${REPO}/issues`,
  contributing: `${REPO}/blob/main/CONTRIBUTING.md`,
  helmReadme: `${REPO}/tree/main/charts/iceguard`,
  license: `${REPO}/blob/main/LICENSE`,
  images: `${REPO}/pkgs/container/iceguard-backend`,
};

export interface Feature {
  icon: 'catalogs' | 'schema' | 'storage' | 'maintenance' | 'pipelines' | 'alerts' | 'timeline' | 'versioning';
  title: string;
  text: string;
}

export const FEATURES: Feature[] = [
  {
    icon: 'catalogs',
    title: 'Every catalog, one console',
    text: 'Register REST, Nessie, Polaris and Unity catalogs side by side and switch between them in a click. None, Bearer and OAuth2 auth.',
  },
  {
    icon: 'schema',
    title: 'Schema & partition evolution',
    text: 'Add, rename, retype and drop columns or evolve partition specs, batched into a single Iceberg commit.',
  },
  {
    icon: 'storage',
    title: 'Storage insight',
    text: 'File-size histograms, per-partition aggregates and file drill-down to spot small-file problems before they hurt.',
  },
  {
    icon: 'maintenance',
    title: 'Real maintenance',
    text: 'Expire snapshots, compact data files, rewrite manifests, remove orphans, roll back, via the Java API or a Spark executor.',
  },
  {
    icon: 'pipelines',
    title: 'Scheduled pipelines',
    text: 'Chain maintenance actions with per-action parameters and a cron schedule, with an Airflow-style run view.',
  },
  {
    icon: 'alerts',
    title: 'Alerts',
    text: 'Threshold rules on table metrics, with optional e-mail notifications when a table drifts out of shape.',
  },
  {
    icon: 'timeline',
    title: 'Timeline & lineage',
    text: 'Snapshots and executions on one timeline, schema-version history with column diffs, snapshot-to-snapshot diffs.',
  },
  {
    icon: 'versioning',
    title: 'Branches & tags',
    text: 'See every Iceberg branch and tag as a git-style graph, plus Nessie history rebuilt from its commit log.',
  },
];

export const CATALOGS = [
  { name: 'Iceberg REST', logo: 'logos/iceberg.png' },
  { name: 'Nessie', logo: 'logos/nessie.svg' },
  { name: 'Apache Polaris', logo: 'logos/polaris.png' },
  { name: 'Unity Catalog', logo: 'logos/unity-catalog.svg' },
];

export interface Step {
  label: string;
  code: string;
}

export interface InstallOption {
  id: string;
  title: string;
  blurb: string;
  steps: Step[];
  open?: string;
}

const CLONE = `git clone ${REPO}.git\ncd iceguard`;

export const HERO_COMMAND = `git clone ${REPO}.git && cd iceguard
docker compose -f docker-compose.images.yml \\
  --profile db --profile sandbox up -d`;

export const INSTALL_OPTIONS: InstallOption[] = [
  {
    id: 'images',
    title: 'Try it (published images)',
    blurb: 'Fastest tour: pulls the published images and starts the app, its Postgres and a sandbox (MinIO + Iceberg REST catalog). Needs only Docker.',
    steps: [
      { label: 'Get the compose files', code: CLONE },
      { label: 'Start app + database + sandbox', code: 'docker compose -f docker-compose.images.yml --profile db --profile sandbox up -d' },
      { label: 'Pin a release instead of :latest (optional)', code: `TAG=${RELEASE_TAG} docker compose -f docker-compose.images.yml --profile db --profile sandbox up -d` },
    ],
    open: 'http://localhost:8090',
  },
  {
    id: 'source',
    title: 'Build from source',
    blurb: 'Same stack, built locally. Three tiers via Compose profiles: the app alone (bring your own Postgres), + database, + test sandbox.',
    steps: [
      { label: 'Clone', code: CLONE },
      { label: 'App only (set ICEGUARD_DB_URL in .env to your Postgres)', code: 'docker compose up -d --build' },
      { label: 'App + its Postgres', code: 'docker compose --profile db up -d --build' },
      { label: 'App + Postgres + sandbox catalog', code: 'docker compose --profile db --profile sandbox up -d --build' },
    ],
    open: 'http://localhost:8090',
  },
  {
    id: 'sandbox',
    title: 'Multi-catalog sandbox',
    blurb: 'Every catalog type at once (REST, Nessie and Polaris) plus a Spark-enabled backend for real compaction.',
    steps: [
      { label: 'Start the sandbox', code: 'docker compose -f docker-compose.dev.yml up -d' },
      { label: 'Register the demo catalogs once the backend is up', code: './scripts/seed-catalog.sh' },
    ],
    open: 'http://localhost:8080/q/swagger-ui',
  },
  {
    id: 'dev',
    title: 'Hack on it',
    blurb: 'Dependencies in Docker, backend and frontend from source with hot reload. Needs JDK 21, Maven and Node 20+.',
    steps: [
      { label: 'Dependencies (Postgres :5433, REST :8181, Nessie :19120, MinIO)', code: 'docker compose -f docker-compose.dev.yml up -d postgres rest-catalog nessie minio minio-init' },
      { label: 'Backend on :8080', code: 'cd backend && mvn quarkus:dev' },
      { label: 'Frontend on :5173 (proxies /api to :8080)', code: 'cd frontend && npm install && npm run dev' },
    ],
    open: 'http://localhost:5173',
  },
];

export const FIRST_CATALOG: [string, string][] = [
  ['Catalog type', 'Iceberg REST'],
  ['URI', 'http://rest-catalog:8181'],
  ['Warehouse', 's3://warehouse/rest/'],
  ['Authentication', 'None'],
  ['S3 endpoint', 'http://minio:9000'],
  ['Access / secret key', 'minioadmin / minioadmin'],
  ['Region · path-style', 'us-east-1 · enabled'],
];

export const HELM_STEPS: Step[] = [
  { label: 'Get the chart', code: CLONE },
  {
    label: 'Install against a PostgreSQL you provide',
    code: `helm install iceguard ./charts/iceguard -n iceguard --create-namespace \\
  --set database.host=pg.internal \\
  --set database.existingSecret=iceguard-db-credentials \\
  --set image.tag=${RELEASE_TAG} \\
  --set backend.image.tag=${RELEASE_TAG} \\
  --set frontend.image.tag=${RELEASE_TAG}`,
  },
  { label: 'Open the UI', code: 'kubectl port-forward -n iceguard svc/iceguard-frontend 8090:80' },
];

export const HELM_TEMPLATE = `helm template iceguard ./charts/iceguard -n iceguard --skip-tests \\
  --set database.host=pg.internal \\
  --set database.existingSecret=iceguard-db-credentials > iceguard.yaml
kubectl create namespace iceguard && kubectl apply -n iceguard -f iceguard.yaml`;
