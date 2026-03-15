import type { ComponentType } from "react";
import { CSGO, Player, Weapon } from "csgogsi";
import { Kills, Skull } from "../../assets/Icons";
import * as WeaponIcons from "../../assets/Weapons";
import "./dangerzone.scss";

const weaponLabelOverrides: Record<string, string> = {
  c4: "C4",
  firebomb: "Fire",
  flashbang: "Flash",
  fists: "Fists",
  hegrenade: "HE",
  healthshot: "Med",
  hkp2000: "P2000",
  incgrenade: "Inc",
  molotov: "Molo",
  shield: "Shield",
  smokegrenade: "Smoke",
  ssg08: "Scout",
  tablet: "Tablet",
  taser: "Zeus",
};

const weaponIconAliases: Record<string, string> = {
  axe: "knife_survival_bowie",
  firebomb: "molotov",
};

const formatLabel = (value: string | null | undefined) =>
  (value || "unknown")
    .replace(/^dz_/, "")
    .replace(/^weapon_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatCurrency = (value: number | undefined) =>
  typeof value === "number" ? `$${value.toLocaleString()}` : "--";

const formatCountdown = (seconds: number | undefined) => {
  if (typeof seconds !== "number" || Number.isNaN(seconds) || seconds <= 0) return null;
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
};

const getWeaponId = (weaponName: string) => weaponName.replace(/^weapon_/, "");

const getWeaponLabel = (weaponName: string) => {
  const weaponId = getWeaponId(weaponName);
  return weaponLabelOverrides[weaponId] || formatLabel(weaponId);
};

const getWeaponShortLabel = (weaponName: string) => {
  const label = getWeaponLabel(weaponName);
  return label.length > 7 ? label.slice(0, 7).toUpperCase() : label.toUpperCase();
};

const getWeaponPriority = (weapon: Weapon) => {
  const weaponId = getWeaponId(weapon.name);
  const type = weapon.type || "";

  if (weapon.state === "active") return -1;
  if (["Rifle", "SniperRifle", "Submachine Gun", "Shotgun", "Machine Gun"].includes(type)) {
    return 0;
  }
  if (type === "Pistol") return 1;
  if (weaponId === "c4") return 2;
  if (["healthshot", "tablet", "shield"].includes(weaponId)) return 3;
  if (type === "Grenade") return 4;
  if (["Melee", "Fists", "Knife"].includes(type) || weaponId === "axe") return 5;
  return 6;
};

const sortWeapons = (weapons: Weapon[]) =>
  [...weapons].sort((left, right) => {
    const priorityDelta = getWeaponPriority(left) - getWeaponPriority(right);
    if (priorityDelta !== 0) return priorityDelta;
    return getWeaponLabel(left.name).localeCompare(getWeaponLabel(right.name));
  });

const isFreeCameraObserver = (game: CSGO) => game.observer.spectarget === "free";

const getObservedSteamId = (game: CSGO) => {
  if (isFreeCameraObserver(game)) {
    return null;
  }
  if (game.observer.spectarget && game.observer.spectarget !== "free") {
    return game.observer.spectarget;
  }
  return game.player?.steamid || null;
};

const sortPlayers = (players: Player[], observedSteamId: string | null) =>
  [...players].sort((left, right) => {
    const observedDelta =
      Number(right.steamid === observedSteamId) - Number(left.steamid === observedSteamId);
    if (observedDelta !== 0) return observedDelta;

    const aliveDelta = Number(right.state.health > 0) - Number(left.state.health > 0);
    if (aliveDelta !== 0) return aliveDelta;

    const scoreDelta = right.stats.score - left.stats.score;
    if (scoreDelta !== 0) return scoreDelta;

    return (left.observer_slot || 99) - (right.observer_slot || 99);
  });

const getObservedPlayer = (game: CSGO, players: Player[]) => {
  if (isFreeCameraObserver(game)) {
    return null;
  }
  const observedSteamId = getObservedSteamId(game);
  return (
    players.find((player) => player.steamid === observedSteamId) ||
    (game.player && players.find((player) => player.steamid === game.player?.steamid)) ||
    game.player ||
    players[0] ||
    null
  );
};

const getFeaturedWeapon = (player: Player | null) =>
  player?.weapons.find((weapon) => weapon.state === "active") ||
  sortWeapons(player?.weapons || [])[0] ||
  null;

const getHealthWidth = (health: number) => Math.max(0, Math.min((health / 120) * 100, 100));

const getArmorWidth = (armor: number) => Math.max(0, Math.min(armor, 100));

const getPhaseLabel = (game: CSGO) =>
  formatLabel(game.phase_countdowns.phase || game.round?.phase || game.map.phase);

const getBadgeText = (player: Player) =>
  player.name
    .split(/\s+/)
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const LoadoutIcon = ({
  weapon,
  compact = false,
}: {
  weapon: Weapon;
  compact?: boolean;
}) => {
  const weaponId = getWeaponId(weapon.name);
  const iconKey = weaponIconAliases[weaponId] || weaponId;
  const Icon = (WeaponIcons as Record<string, ComponentType<any>>)[iconKey];
  const hasCountBadge = typeof weapon.ammo_reserve === "number" && weapon.ammo_reserve > 1;

  return (
    <div
      className={`dz-loadout-item ${weapon.state === "active" ? "active" : ""} ${
        compact ? "compact" : ""
      }`}
      title={getWeaponLabel(weapon.name)}
    >
      <div className="dz-loadout-glyph">
        {Icon ? (
          <Icon className="dz-weapon-svg" />
        ) : (
          <span className="dz-loadout-fallback">{getWeaponShortLabel(weapon.name)}</span>
        )}
      </div>
      {!compact ? <span className="dz-loadout-label">{getWeaponLabel(weapon.name)}</span> : null}
      {hasCountBadge ? <span className="dz-loadout-count">x{weapon.ammo_reserve}</span> : null}
    </div>
  );
};

const WingPlayerCard = ({
  player,
  side,
}: {
  player: Player;
  side: "left" | "right";
}) => {
  const weapons = sortWeapons(player.weapons);
  const isAlive = player.state.health > 0;

  return (
    <article className={`dz-wing-card ${side} ${!isAlive ? "dead" : ""}`}>
      <div className="dz-wing-badge">{getBadgeText(player)}</div>
      <div className="dz-wing-name">{player.name}</div>
      <div className="dz-wing-loadout">
        {weapons.length ? (
          weapons.map((weapon) => <LoadoutIcon key={weapon.id} weapon={weapon} compact />)
        ) : (
          <div className="dz-empty-loadout">No loadout</div>
        )}
      </div>
      <div className="dz-wing-stats">
        <span>{formatCurrency(player.state.money)}</span>
        <span>{player.state.health} HP</span>
      </div>
      <div className="dz-wing-record">
        <span>
          <Kills />
          {player.stats.kills}
        </span>
        <span>
          <Skull />
          {player.stats.deaths}
        </span>
      </div>
      <div className="dz-wing-health">
        <span style={{ width: `${getHealthWidth(player.state.health)}%` }} />
      </div>
    </article>
  );
};

const DangerZoneLayout = ({ game }: { game: CSGO }) => {
  const isFreeCamera = isFreeCameraObserver(game);
  const observedSteamId = getObservedSteamId(game);
  const players = sortPlayers(game.players, observedSteamId);
  const observedPlayer = getObservedPlayer(game, players);
  const featuredWeapon = getFeaturedWeapon(observedPlayer);
  const alivePlayers = players.filter((player) => player.state.health > 0);
  const eliminatedPlayers = players.length - alivePlayers.length;
  const countdown = formatCountdown(game.phase_countdowns.phase_ends_in);
  const sidePlayers = isFreeCamera
    ? players
    : players.filter((player) => player.steamid !== observedPlayer?.steamid);
  const leftCount = Math.ceil(sidePlayers.length / 2);
  const leftPlayers = sidePlayers.slice(0, leftCount);
  const rightPlayers = sidePlayers.slice(leftCount);

  return (
    <div className="danger-zone-layout">
      <section className="dz-scorebar">
        <div className="dz-team-panel left">
          <div className="dz-team-kicker">Danger Zone</div>
          <div className="dz-team-name">{formatLabel(game.map.name)}</div>
          <div className="dz-team-meta">
            <span>{formatLabel(game.map.mode)}</span>
            <span>{alivePlayers.length} Alive</span>
          </div>
        </div>

        <div className="dz-score-center">
          <div className="dz-score-box left">
            <span>Alive</span>
            <strong>{alivePlayers.length}</strong>
          </div>
          <div className="dz-clock-box">
            <span>{getPhaseLabel(game)}</span>
            <strong>{countdown || formatLabel(game.map.phase)}</strong>
            <small>{players.length} tracked players</small>
          </div>
          <div className="dz-score-box right">
            <span>Out</span>
            <strong>{eliminatedPlayers}</strong>
          </div>
        </div>

        <div className="dz-team-panel right">
          <div className="dz-team-kicker">Observer Feed</div>
          <div className="dz-team-name">
            {isFreeCamera ? "Free Cam" : observedPlayer?.name || "No Target"}
          </div>
          <div className="dz-team-meta">
            <span>Spectators {game.map.current_spectators}</span>
            <span>{isFreeCamera ? "Detached" : `Slot ${observedPlayer?.observer_slot ?? "--"}`}</span>
          </div>
        </div>
      </section>

      <section className="dz-bottom-ribbon">
        <div className="dz-wing left">
          {leftPlayers.map((player) => (
            <WingPlayerCard key={player.steamid} player={player} side="left" />
          ))}
        </div>

        {isFreeCamera ? (
          <div className="dz-observed-spacer" aria-hidden="true" />
        ) : (
          <article className="dz-observed-card">
            <div className="dz-observed-top">
              <div className="dz-observed-badge">
                {observedPlayer ? getBadgeText(observedPlayer) : "--"}
              </div>
              <div className="dz-observed-title">
                <div className="dz-observed-name">{observedPlayer?.name || "No Target"}</div>
                <div className="dz-observed-meta">
                  <span>Score {observedPlayer?.stats.score ?? "--"}</span>
                  <span>
                    K/D {observedPlayer?.stats.kills ?? "--"}/{observedPlayer?.stats.deaths ?? "--"}
                  </span>
                  <span>Cash {formatCurrency(observedPlayer?.state.money)}</span>
                </div>
              </div>
              <div className="dz-observed-record">
                <div>
                  <span>HP</span>
                  <strong>{observedPlayer?.state.health ?? "--"}</strong>
                </div>
                <div>
                  <span>Armor</span>
                  <strong>
                    {observedPlayer?.state.armor ?? "--"}
                    {observedPlayer?.state.helmet ? "H" : ""}
                  </strong>
                </div>
              </div>
            </div>

            <div className="dz-observed-weapon-row">
              <div className="dz-observed-weapon">
                {featuredWeapon ? (
                  <LoadoutIcon weapon={featuredWeapon} />
                ) : (
                  <div className="dz-empty-loadout">No active item</div>
                )}
              </div>
              <div className="dz-observed-stats">
                <div>
                  <span>Loadout</span>
                  <strong>{formatCurrency(observedPlayer?.state.equip_value)}</strong>
                </div>
                <div>
                  <span>Round Dmg</span>
                  <strong>{observedPlayer?.state.round_totaldmg ?? "--"}</strong>
                </div>
                <div>
                  <span>Observer Slot</span>
                  <strong>{observedPlayer?.observer_slot ?? "--"}</strong>
                </div>
              </div>
            </div>

            <div className="dz-observed-loadout">
              {observedPlayer?.weapons?.length ? (
                sortWeapons(observedPlayer.weapons).map((weapon) => (
                  <LoadoutIcon key={weapon.id} weapon={weapon} compact />
                ))
              ) : (
                <div className="dz-empty-loadout">No loadout</div>
              )}
            </div>

            <div className="dz-observed-bars">
              <div className="dz-observed-bar health">
                <span style={{ width: `${getHealthWidth(observedPlayer?.state.health || 0)}%` }} />
              </div>
              <div className="dz-observed-bar armor">
                <span style={{ width: `${getArmorWidth(observedPlayer?.state.armor || 0)}%` }} />
              </div>
            </div>
          </article>
        )}

        <div className="dz-wing right">
          {rightPlayers.map((player) => (
            <WingPlayerCard key={player.steamid} player={player} side="right" />
          ))}
        </div>
      </section>
    </div>
  );
};

export default DangerZoneLayout;
