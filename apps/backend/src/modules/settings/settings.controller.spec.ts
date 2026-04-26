import { Test } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: SettingsService;

  const mockSettings = {
    id: 's1',
    userId: 'user-1',
    theme: 'system',
    llmProvider: 'kimi',
    pomodoroFocus: 25,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: {
            findOrCreate: jest.fn().mockResolvedValue(mockSettings),
            update: jest.fn().mockResolvedValue({ ...mockSettings, theme: 'dark' }),
          },
        },
      ],
    }).compile();

    controller = module.get(SettingsController);
    service = module.get(SettingsService);
  });

  it('应获取用户设置', async () => {
    const req = { user: { id: 'user-1' } };
    const result = await controller.getSettings(req as any);

    expect(service.findOrCreate).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(mockSettings);
  });

  it('应更新用户设置', async () => {
    const req = { user: { id: 'user-1' } };
    const dto = { theme: 'dark', pomodoroFocus: 45 };
    const result = await controller.updateSettings(req as any, dto);

    expect(service.update).toHaveBeenCalledWith('user-1', dto);
    expect(result.theme).toBe('dark');
  });
});
