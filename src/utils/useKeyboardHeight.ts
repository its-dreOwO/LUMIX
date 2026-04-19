import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Returns the current keyboard height (0 when closed).
 * On Android we listen to `keyboardDidShow` / `keyboardDidHide` because
 * the `Will*` events don't fire there. On iOS we use the `Will*` events
 * so the UI animates in step with the keyboard.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const show = Keyboard.addListener(showEvt, (e) => {
      setHeight(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(hideEvt, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
