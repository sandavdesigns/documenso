import { redirect } from 'react-router';

import type { Route } from './+types/o.$orgUrl.settings.certificates';

export function loader({ params }: Route.LoaderArgs) {
  throw redirect(`/o/${params.orgUrl}/settings/document`);
}
