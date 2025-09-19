import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

describe('HomePage', () => {
  it('renders the main heading', () => {
    render(<HomePage />);
    const heading = screen.getByRole('heading', { name: /团队日历同步器/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<HomePage />);
    const description = screen.getByText(/轻量级团队日历管理 PWA 应用/i);
    expect(description).toBeInTheDocument();
  });

  it('renders the main action links', () => {
    render(<HomePage />);
    const startLink = screen.getByRole('link', { name: /开始使用/i });
    const loginLink = screen.getByRole('link', { name: /登录/i });

    expect(startLink).toBeInTheDocument();
    expect(startLink).toHaveAttribute('href', '/auth/register');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/auth/login');
  });

  it('renders feature cards', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', { name: /团队协作/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /事件管理/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /iCalendar 订阅/i })
    ).toBeInTheDocument();
  });

  it('renders the success message', () => {
    render(<HomePage />);
    const successMessage = screen.getByText(/项目初始化完成/i);
    expect(successMessage).toBeInTheDocument();
  });
});
