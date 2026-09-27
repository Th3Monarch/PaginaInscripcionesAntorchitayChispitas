"use client";

import { useEffect, useState } from "react";

/**
 * Aviso de desarrollo: algunas extensiones (Urban Browser Guard, Urban VPN
 * Proxy) reescriben el HTML antes de que React hidrate y provocan el error
 * "A tree hydrated but some attributes... didn't match". La app no es la
 * culpable, pero en desarrollo el mensaje se repite en cada recarga y confunde.
 * Solo se muestra en `next dev`; nunca en producción.
 */
const MARCADORES = ["bis_skin_checked", "bis_register", "__processed_"];

export function AvisoExtension() {
  const [visible, setVisible] = useState(false);
  const [cerrado, setCerrado] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const detectar = () => {
      const nodos = [document.documentElement, document.body, ...(document.body?.children ?? [])];
      const afectado = nodos.some((nodo) =>
        nodo?.hasAttributes?.() ? MARCADORES.some((m) => nodo.hasAttribute(m)) : false,
      );
      if (afectado) setVisible(true);
    };

    detectar();
    const observador = new MutationObserver(detectar);
    if (document.body) {
      observador.observe(document.body, {
        attributes: true,
        attributeFilter: MARCADORES,
        subtree: false,
      });
    }
    return () => observador.disconnect();
  }, []);

  if (!visible || cerrado) return null;

  return (
    <div
      role="status"
      className="border-b-2 border-[#f0a30a] bg-[#1a1a1a] px-4 py-3 text-sm text-white"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-3">
        <p className="leading-relaxed">
          <span className="font-bold">Aviso del navegador:</span> una extensión
          está modificando esta página antes de que React la cargue, y por eso
          ves &laquo;A tree hydrated but some attributes...&laquo;. La web está
          bien. Busca <span className="font-semibold">Urban Browser Guard</span> o
          {" "}
          <span className="font-semibold">Urban VPN Proxy</span> en{" "}
          <span className="font-semibold">chrome://extensions</span> y pon su
          acceso a sitios web en &laquo;En sitios específicos&raquo; con{" "}
          <span className="font-semibold">localhost</span>, o desactívala
          mientras desarrollo.
        </p>
        <button
          type="button"
          onClick={() => setCerrado(true)}
          className="shrink-0 rounded border border-white/40 px-2 py-1 text-xs font-semibold hover:bg-white/10"
        >
          Ocultar
        </button>
      </div>
    </div>
  );
}
