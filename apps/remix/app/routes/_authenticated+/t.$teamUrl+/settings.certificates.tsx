import { redirect } from 'react-router';

import type { Route } from './+types/settings.certificates';

export function loader({ params }: Route.LoaderArgs) {
  throw redirect(`/t/${params.teamUrl}/settings/document`);
}
