#[cfg(target_os = "macos")]
mod screen_lock {
    use core_foundation::{
        base::TCFType,
        boolean::CFBoolean,
        dictionary::CFDictionary,
        string::CFString,
    };
    use core_foundation_sys::dictionary::CFDictionaryRef;

    #[link(name = "ApplicationServices", kind = "framework")]
    unsafe extern "C" {
        fn CGSessionCopyCurrentDictionary() -> CFDictionaryRef;
    }

    pub fn is_locked() -> bool {
        unsafe {
            let raw_dictionary = CGSessionCopyCurrentDictionary();
            if raw_dictionary.is_null() {
                return false;
            }
            let dictionary =
                CFDictionary::<CFString, CFBoolean>::wrap_under_create_rule(raw_dictionary);
            dictionary
                .find(&CFString::new("CGSSessionScreenIsLocked"))
                .is_some_and(|value| *value == CFBoolean::true_value())
        }
    }
}

#[tauri::command]
fn is_screen_locked() -> bool {
    #[cfg(target_os = "macos")]
    return screen_lock::is_locked();

    #[cfg(not(target_os = "macos"))]
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![is_screen_locked])
        .run(tauri::generate_context!())
        .expect("error while running posture reminder");
}
