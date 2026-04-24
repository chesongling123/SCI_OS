import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('应合并多个类名', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('应处理条件类名', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('应解决 Tailwind 冲突类名', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});
