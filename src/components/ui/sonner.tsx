import { Toaster as Sonner } from 'sonner';

export function Toaster(props: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-(--background) group-[.toaster]:text-(--foreground) group-[.toaster]:border-(--border)',
          description: 'group-[.toast]:text-(--muted-foreground)',
        },
      }}
      {...props}
    />
  );
}
