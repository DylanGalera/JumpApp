
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import clsx from 'clsx'

export function Spinner({
  size,
  minHeight,
}: {
  size?: 'default' | 'small'
  minHeight?: number
}) {
  return (
    <div
      className={`flex mx-auto my-auto h-full items-center min-h-[${minHeight || 10}px]`}
    >
      <FontAwesomeIcon
        className={clsx('animate-spin text-2xl mx-auto', {
          'text-sm': size === 'small',
        })}
        icon={faSpinner}
      />
    </div>
  )
}
