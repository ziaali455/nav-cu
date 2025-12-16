import { Redirect } from 'expo-router';

export default function Index() {
  // Use relative path for GitHub Pages compatibility
  return <Redirect href="/settings" />;
}
