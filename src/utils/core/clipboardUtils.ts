/**
 * Universal clipboard utility with fallback support
 * Provides consistent copy functionality across the application
 */

export interface CopyResult {
  success: boolean;
  message: string;
  requiresManualCopy?: boolean;
  exportText?: string;
}

/**
 * Copy text to clipboard with automatic fallback support
 *
 * @param text - The text to copy to clipboard
 * @returns Promise<CopyResult> - Result object with success status and message
 */
async function copyToClipboard(text: string): Promise<CopyResult> {
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return {
        success: true,
        message: "Copied to clipboard",
      };
    }

    // Fallback to execCommand for older browsers
    const fallbackResult = fallbackCopy(text);
    if (fallbackResult.success) {
      return {
        success: true,
        message: "Copied to clipboard",
      };
    }

    // All methods failed, return manual copy result
    return {
      success: true,
      message: "Please copy manually",
      requiresManualCopy: true,
      exportText: text,
    };
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    return {
      success: false,
      message: "Copy failed, check browser permissions",
    };
  }
}

/**
 * Fallback copy method using execCommand for older browsers
 *
 * @param text - The text to copy
 * @returns Object with success status
 */
function fallbackCopy(text: string): { success: boolean } {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999); // For mobile devices

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    return { success: successful };
  } catch (err) {
    console.error("Fallback copy failed:", err);
    return { success: false };
  }
}

/**
 * Copy text with custom success/error messages
 *
 * @param text - The text to copy
 * @param successMessage - Custom success message
 * @param errorMessage - Custom error message
 * @returns Promise<CopyResult> - Result object with custom messages
 */
export async function copyToClipboardWithMessages(
  text: string,
  successMessage: string,
  errorMessage?: string,
): Promise<CopyResult> {
  const result = await copyToClipboard(text);

  if (result.success) {
    return {
      ...result,
      message: successMessage,
    };
  } else {
    return {
      ...result,
      message: errorMessage || result.message,
    };
  }
}
