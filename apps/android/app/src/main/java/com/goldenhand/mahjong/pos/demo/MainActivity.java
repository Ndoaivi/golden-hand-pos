package com.goldenhand.mahjong.pos.demo;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // Close the active dialog/menu first. Leaving the app keeps local demo data.
                bridge.getWebView().evaluateJavascript(
                    "window.dispatchEvent(new Event('golden-hand:native-back', {cancelable:true}))",
                    result -> { if ("true".equals(result)) finish(); }
                );
            }
        });
    }
}
