/**
 * Tests for MemberPicker component
 *
 * Covers:
 * - Renders selected member name when member exists
 * - Calls setSelectedMemberId when a member is selected from the list
 * - Renders "Add First Member" trigger when no members exist
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MemberPicker } from '@/components/member-picker';

const mockSetSelectedMemberId = jest.fn();
const mockPush = jest.fn();

jest.mock('@/hooks/use-family', () => ({
  useFamily: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Modal: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
      visible ? <RN.View testID="modal">{children}</RN.View> : null,
    useWindowDimensions: () => ({ width: 360 }),
  };
});

import { useFamily } from '@/hooks/use-family';

const mockFamily = { id: 'family-1', name: 'Test Family', ownerId: 'u1', createdAt: null };
const mockMembers = [
  { id: 'm1', familyId: 'family-1', name: 'Alice', color: '#FF0000' },
  { id: 'm2', familyId: 'family-1', name: 'Bob', color: '#00FF00' },
];

describe('MemberPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFamily as jest.Mock).mockReturnValue({
      family: mockFamily,
      members: mockMembers,
      selectedMember: mockMembers[0],
      selectedMemberId: 'm1',
      setSelectedMemberId: mockSetSelectedMemberId,
    });
  });

  it('should render selected member name in trigger', () => {
    const { getByText } = render(<MemberPicker />);
    expect(getByText('Alice')).toBeTruthy();
  });

  it('should call setSelectedMemberId when a member is pressed in the modal', () => {
    const { getByText } = render(<MemberPicker />);

    fireEvent.press(getByText('Alice'));
    const bobOption = getByText('Bob');
    fireEvent.press(bobOption);

    expect(mockSetSelectedMemberId).toHaveBeenCalledWith('m2');
  });

  it('should render null when no family', () => {
    (useFamily as jest.Mock).mockReturnValue({
      family: null,
      members: [],
      selectedMember: null,
      selectedMemberId: null,
      setSelectedMemberId: mockSetSelectedMemberId,
    });
    const { queryByText } = render(<MemberPicker />);
    expect(queryByText('Alice')).toBeNull();
  });

  it('should show Add First Member when no members exist', () => {
    (useFamily as jest.Mock).mockReturnValue({
      family: mockFamily,
      members: [],
      selectedMember: null,
      selectedMemberId: null,
      setSelectedMemberId: mockSetSelectedMemberId,
    });
    const { getByText } = render(<MemberPicker />);
    expect(getByText('memberPicker.addFirstMember')).toBeTruthy();
  });
});
