import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the interpret page (now the main page)
  redirect('/interpret');
}
